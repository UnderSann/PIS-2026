class InMemoryEventBus {
  constructor() {
    this.subscribers = new Map();
  }

  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(handler);
  }

  async publish(event) {
    const handlers = this.subscribers.get(event.type) || [];
    

    const promises = handlers.map(handler => 
      handler(event).catch(error => {
        console.error(`Error in handler for ${event.type}:`, error);
  
      })
    );
    
    await Promise.allSettled(promises);
  }
}