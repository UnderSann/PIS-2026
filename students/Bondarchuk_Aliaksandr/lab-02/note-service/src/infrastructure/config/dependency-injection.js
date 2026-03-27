// src/infrastructure/config/dependency-injection.js

const NoteService = require('../../application/service/note-service');
const NoteController = require('../adapter/in/note-controller');
const InMemoryNoteRepository = require('../adapter/out/in-memory-note-repository');
const InMemoryFileStorage = require('../adapter/out/in-memory-file-storage');

class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    
    this.registerServices();
  }

  registerServices() {
    // Репозитории (синглтоны)
    this.registerSingleton('noteRepository', new InMemoryNoteRepository());
    this.registerSingleton('fileStorage', new InMemoryFileStorage());
    
    // Сервисы (создаются с зависимостями)
    this.registerFactory('noteService', () => {
      const noteRepository = this.get('noteRepository');
      const fileStorage = this.get('fileStorage');
      return new NoteService(noteRepository, fileStorage);
    });
    
    // Контроллеры
    this.registerFactory('noteController', () => {
      const noteService = this.get('noteService');
      return new NoteController(noteService);
    });
  }

  registerSingleton(name, instance) {
    this.singletons.set(name, instance);
  }

  registerFactory(name, factory) {
    this.services.set(name, factory);
  }

  get(name) {
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }
    
    if (this.services.has(name)) {
      const factory = this.services.get(name);
      const instance = factory();
      this.singletons.set(name, instance); // кешируем как синглтон
      return instance;
    }
    
    throw new Error(`Service ${name} not found`);
  }
}

module.exports = DIContainer;