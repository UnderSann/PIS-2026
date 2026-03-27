const NoteId = require('../value_objects/note_id');
const NoteTitle = require('../value_objects/note_title');
const NoteContent = require('../value_objects/note_content');
const OwnerId = require('../value_objects/owner_id');

class Note {
  #id;
  #ownerId;
  #title;
  #content;
  #version;
  #isDeleted;
  #createdAt;
  #updatedAt;

  constructor(id, ownerId, title, content) {
    if (!(id instanceof NoteId)) throw new Error('Invalid NoteId');
    if (!(ownerId instanceof OwnerId)) throw new Error('Invalid OwnerId');
    if (!(title instanceof NoteTitle)) throw new Error('Invalid NoteTitle');
    if (!(content instanceof NoteContent)) throw new Error('Invalid NoteContent');
    

    this.#id = id;
    this.#ownerId = ownerId;
    this.#title = title;
    this.#content = content;
    this.#version = 1;
    this.#isDeleted = false;
    this.#createdAt = new Date();
    this.#updatedAt = new Date();
    
  }

  // Геттеры
  get id() { return this.#id; }
  get ownerId() { return this.#ownerId; }
  get title() { return this.#title; }
  get content() { return this.#content; }
  get version() { return this.#version; }

  // --- Бизнес-методы ---
  updateContent(newContent) {
    if (!(newContent instanceof NoteContent)) {
      throw new Error('Invalid NoteContent');
    }
    if (this.#isDeleted) {
      throw new Error('Cannot update a deleted note');
    }
    this.#content = newContent;
    this.#version += 1;
    this.#updatedAt = new Date();
  }

  updateTitle(newTitle) {
    if (!(newTitle instanceof NoteTitle)) {
      throw new Error('Invalid NoteTitle');
    }
    if (this.#isDeleted) {
      throw new Error('Cannot update a deleted note');
    }
    this.#title = newTitle;
    this.#updatedAt = new Date();
  }

  delete() {
    if (this.#isDeleted) {
      throw new Error('Note is already deleted');
    }
    this.#isDeleted = true;
    this.#updatedAt = new Date();
  }

  restore() {
    if (!this.#isDeleted) {
      throw new Error('Note is not deleted');
    }
    this.#isDeleted = false;
    this.#updatedAt = new Date();
  }

  // Реализация равенства по ID
  equals(other) {
    if (!(other instanceof Note)) return false;
    return this.#id.equals(other.#id);
  }

  // hashCode для использования в коллекциях
  hashCode() {
    return this.#id.value.hashCode(); // упрощенная реализация
  }
}

module.exports = Note;