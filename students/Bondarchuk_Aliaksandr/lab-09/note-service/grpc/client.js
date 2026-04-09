const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/note_service.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const notesync = grpc.loadPackageDefinition(packageDefinition).notesync;

class NoteServiceClient {
  constructor(serverAddress = 'localhost:50051') {
    this.client = new notesync.NoteService(
      serverAddress,
      grpc.credentials.createInsecure()
    );
  }

  // Унарный вызов: создание заметки
  async createNote(ownerId, title, content) {
    return new Promise((resolve, reject) => {
      this.client.createNote({ owner_id: ownerId, title, content }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }

  // Унарный вызов: получение заметки
  async getNote(noteId) {
    return new Promise((resolve, reject) => {
      this.client.getNote({ id: noteId }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }

  // Унарный вызов: обновление заметки
  async updateNote(noteId, content, expectedVersion) {
    return new Promise((resolve, reject) => {
      this.client.updateNote(
        { id: noteId, content, expected_version: expectedVersion },
        (error, response) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  }

  // Унарный вызов: удаление заметки
  async deleteNote(noteId) {
    return new Promise((resolve, reject) => {
      this.client.deleteNote({ id: noteId }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }

  // Server-side streaming: подписка на обновления
  streamNotes(ownerId, sinceVersion = 0, onUpdate, onError, onEnd) {
    const stream = this.client.streamNotesByOwner({
      owner_id: ownerId,
      since_version: sinceVersion,
    });
    
    stream.on('data', (update) => {
      onUpdate(update);
    });
    
    stream.on('error', (error) => {
      if (onError) onError(error);
    });
    
    stream.on('end', () => {
      if (onEnd) onEnd();
    });
    
    return stream;
  }

  // Client-side streaming: синхронизация нескольких операций
  async syncNotes(operations) {
    return new Promise((resolve, reject) => {
      const call = this.client.syncNotes((error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
      
      for (const op of operations) {
        call.write(op);
      }
      call.end();
    });
  }
}

// Пример использования
async function demo() {
  const client = new NoteServiceClient();
  
  console.log('1. Creating note...');
  const { id: noteId } = await client.createNote('user-123', 'gRPC Demo', 'Hello from gRPC!');
  console.log(`   Created note: ${noteId}`);
  
  console.log('\n2. Getting note...');
  const note = await client.getNote(noteId);
  console.log(`   Title: ${note.title}, Version: ${note.version}`);
  
  console.log('\n3. Updating note...');
  await client.updateNote(noteId, 'Updated content via gRPC', note.version);
  
  const updated = await client.getNote(noteId);
  console.log(`   New version: ${updated.version}, Content: ${updated.content}`);
  
  console.log('\n4. Streaming notes (will wait 10s for real-time updates)...');
  let updateCount = 0;
  const stream = client.streamNotes('user-123', 0, (update) => {
    updateCount++;
    console.log(`   [Stream] ${update.operation}: ${update.note.title} (v${update.note.version})`);
  });
  
  setTimeout(() => {
    stream.cancel();
    console.log(`   Total stream updates: ${updateCount}`);
  }, 10000);
}

// Запуск демо
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = NoteServiceClient;