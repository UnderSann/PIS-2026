// src/application/port/in/update-note-use-case.js

class UpdateNoteCommand {
  constructor(noteId, userId, title, fileContent) {
    this.noteId = noteId;
    this.userId = userId;
    this.title = title;
    this.fileContent = fileContent;
  }
}

class IUpdateNoteUseCase {
  async execute(command) {
    throw new Error('Not implemented');
  }
}

module.exports = { UpdateNoteCommand, IUpdateNoteUseCase };