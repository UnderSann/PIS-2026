// src/application/service/note-service.js

const { ICreateNoteUseCase } = require('../port/in/create-note-use-case');
const { IGetNoteUseCase } = require('../port/in/get-note-use-case');
const { IUpdateNoteUseCase } = require('../port/in/update-note-use-case');
const { IDeleteNoteUseCase } = require('../port/in/delete-note-use-case');
const Note = require('../../domain/models/note');
const { NoteNotFoundException, UnauthorizedNoteAccessException } = require('../../domain/exceptions/domain-exception');
const { v4: uuidv4 } = require('uuid');

class NoteService extends ICreateNoteUseCase {
  constructor(noteRepository, fileStorage) {
    super();
    this.noteRepository = noteRepository;
    this.fileStorage = fileStorage;
  }

  // CREATE
  async execute(command) {
    const { ownerId, title, fileContent } = command;
    
    // 1. Сохраняем файл
    const contentUri = await this.fileStorage.upload(fileContent, ownerId);
    
    // 2. Создаем заметку
    const note = new Note(uuidv4(), ownerId, title, contentUri);
    
    // 3. Сохраняем в БД
    const savedNote = await this.noteRepository.save(note);
    
    return savedNote;
  }

  // GET
  async execute(query) {
    const { noteId, userId } = query;
    
    const note = await this.noteRepository.findById(noteId);
    if (!note) {
      throw new NoteNotFoundException(noteId);
    }
    
    if (note.ownerId !== userId) {
      throw new UnauthorizedNoteAccessException(noteId, userId);
    }
    
    return note;
  }
}

module.exports = NoteService;