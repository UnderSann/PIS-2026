const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Загрузка proto файла
const PROTO_PATH = path.join(__dirname, '../proto/note_service.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const notesync = grpc.loadPackageDefinition(packageDefinition).notesync;

class NoteServiceServer {
  constructor(noteApplicationService, eventBus) {
    this.noteService = noteApplicationService;
    this.eventBus = eventBus;
    this.activeStreams = new Map(); // ownerId -> Set of streams
  }

  // Унарный RPC: CreateNote
  async createNote(call, callback) {
    try {
      const { owner_id, title, content } = call.request;
      
      const noteId = await this.noteService.createNote({
        ownerId: owner_id,
        title,
        content,
      });
      
      callback(null, { id: noteId, version: 1 });
    } catch (error) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: error.message,
      });
    }
  }

  // Унарный RPC: GetNote
  async getNote(call, callback) {
    try {
      const { id } = call.request;
      const note = await this.noteService.getNoteById({ noteId: id });
      
      if (!note) {
        callback({
          code: grpc.status.NOT_FOUND,
          message: `Note ${id} not found`,
        });
        return;
      }
      
      callback(null, {
        id: note.id,
        owner_id: note.ownerId,
        title: note.title,
        content: note.content,
        version: note.version,
        is_deleted: note.isDeleted,
        created_at: note.createdAt.toISOString(),
        updated_at: note.updatedAt.toISOString(),
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    }
  }

  // Server-side streaming: StreamNotesByOwner
  streamNotesByOwner(call) {
    const { owner_id, since_version } = call.request;
    
    console.log(`[gRPC] Client subscribed to notes for owner ${owner_id}`);
    
    // Сохраняем поток для отправки обновлений
    if (!this.activeStreams.has(owner_id)) {
      this.activeStreams.set(owner_id, new Set());
    }
    this.activeStreams.get(owner_id).add(call);
    
    // Отправляем историю изменений (начиная с since_version)
    this.sendHistory(call, owner_id, since_version);
    
    // Обработка отключения клиента
    call.on('cancelled', () => {
      console.log(`[gRPC] Client unsubscribed from owner ${owner_id}`);
      this.activeStreams.get(owner_id)?.delete(call);
      if (this.activeStreams.get(owner_id)?.size === 0) {
        this.activeStreams.delete(owner_id);
      }
    });
  }

  async sendHistory(call, ownerId, sinceVersion) {
    try {
      const notes = await this.noteService.listNotesByOwner({
        ownerId,
        includeDeleted: true,
      });
      
      for (const note of notes) {
        if (note.version > sinceVersion) {
          const update = {
            operation: note.isDeleted ? 'DELETED' : (note.version === 1 ? 'CREATED' : 'UPDATED'),
            note: this.toProtoNote(note),
            timestamp: Date.now(),
          };
          call.write(update);
        }
      }
    } catch (error) {
      console.error('[gRPC] Error sending history:', error);
    }
  }

  // Client-side streaming: SyncNotes
  async syncNotes(call, callback) {
    const operations = [];
    const failedIds = [];
    
    call.on('data', async (operation) => {
      operations.push(operation);
    });
    
    call.on('end', async () => {
      let processed = 0;
      
      for (const op of operations) {
        try {
          if (op.create) {
            await this.noteService.createNote({
              ownerId: op.create.owner_id,
              title: op.create.title,
              content: op.create.content,
            });
          } else if (op.update) {
            await this.noteService.updateNoteContent({
              noteId: op.update.id,
              content: op.update.content,
              expectedVersion: op.update.expected_version,
            });
          } else if (op.delete) {
            await this.noteService.deleteNote({
              noteId: op.delete.id,
            });
          }
          processed++;
        } catch (error) {
          failedIds.push(op.operation_id);
        }
      }
      
      callback(null, {
        sync_id: `sync-${Date.now()}`,
        processed_count: processed,
        failed_operation_ids: failedIds,
      });
    });
  }

  toProtoNote(note) {
    return {
      id: note.id,
      owner_id: note.ownerId,
      title: note.title,
      content: note.content,
      version: note.version,
      is_deleted: note.isDeleted,
      created_at: note.createdAt.toISOString(),
      updated_at: note.updatedAt.toISOString(),
    };
  }

  // Публикация обновлений подписчикам
  publishUpdate(ownerId, operation, note) {
    const streams = this.activeStreams.get(ownerId);
    if (!streams) return;
    
    const update = {
      operation: operation,
      note: this.toProtoNote(note),
      timestamp: Date.now(),
    };
    
    for (const stream of streams) {
      stream.write(update);
    }
  }
}

function startGrpcServer(noteService, eventBus, port = 50051) {
  const server = new grpc.Server();
  const impl = new NoteServiceServer(noteService, eventBus);
  
  server.addService(notesync.NoteService.service, {
    createNote: impl.createNote.bind(impl),
    getNote: impl.getNote.bind(impl),
    updateNote: impl.updateNote.bind(impl),
    deleteNote: impl.deleteNote.bind(impl),
    streamNotesByOwner: impl.streamNotesByOwner.bind(impl),
    syncNotes: impl.syncNotes.bind(impl),
  });
  
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, bindPort) => {
      if (err) {
        console.error('[gRPC] Failed to bind:', err);
        return;
      }
      server.start();
      console.log(`[gRPC] Server running on port ${bindPort}`);
    }
  );
  
  // Подписка на доменные события для real-time обновлений
  eventBus.subscribe('NoteCreatedEvent', (event) => {
    impl.publishUpdate(event.data.ownerId, 'CREATED', event.data.note);
  });
  
  eventBus.subscribe('NoteContentUpdatedEvent', (event) => {
    impl.publishUpdate(event.data.ownerId, 'UPDATED', event.data.note);
  });
  
  eventBus.subscribe('NoteDeletedEvent', (event) => {
    impl.publishUpdate(event.data.ownerId, 'DELETED', event.data.note);
  });
  
  return server;
}

module.exports = { startGrpcServer };