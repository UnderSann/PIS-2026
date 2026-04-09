// src/application/port/in/delete-note-use-case.js

class DeleteNoteCommand {
  constructor(noteId, userId) {
    this.noteId = noteId;
    this.userId = userId;
  }
}

class IDeleteNoteUseCase {
  async execute(command) {
    throw new Error('Not implemented');
  }
}

module.exports = { DeleteNoteCommand, IDeleteNoteUseCase };