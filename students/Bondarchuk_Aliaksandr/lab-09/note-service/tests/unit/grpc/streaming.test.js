const { startGrpcServer } = require('../../grpc/server');
const NoteServiceClient = require('../../grpc/client');

describe('gRPC Streaming', () => {
  let server;
  let client;
  
  beforeAll(async () => {
    // Запуск gRPC сервера на свободном порту
    server = startGrpcServer(mockNoteService, mockEventBus, 50052);
    client = new NoteServiceClient('localhost:50052');
  });
  
  afterAll(() => {
    server.forceShutdown();
  });
  
  test('should receive real-time updates via stream', (done) => {
    const receivedUpdates = [];
    
    const stream = client.streamNotes('user-stream', 0, (update) => {
      receivedUpdates.push(update);
      
      if (receivedUpdates.length === 3) {
        expect(receivedUpdates.map(u => u.operation)).toEqual([
          'CREATED', 'UPDATED', 'DELETED'
        ]);
        stream.cancel();
        done();
      }
    });
    
    // Имитируем события через eventBus
    setTimeout(() => {
      mockEventBus.emit('NoteCreatedEvent', { 
        data: { ownerId: 'user-stream', note: mockNote1 }
      });
    }, 100);
    
    setTimeout(() => {
      mockEventBus.emit('NoteContentUpdatedEvent', {
        data: { ownerId: 'user-stream', note: mockNote1Updated }
      });
    }, 200);
    
    setTimeout(() => {
      mockEventBus.emit('NoteDeletedEvent', {
        data: { ownerId: 'user-stream', note: mockNote1Deleted }
      });
    }, 300);
  });
});