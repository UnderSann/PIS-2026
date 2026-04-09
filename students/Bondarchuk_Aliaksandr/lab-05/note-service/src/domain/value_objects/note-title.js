class NoteTitle {
  #value;
  static MAX_LENGTH = 255;

  constructor(title) {
    if (title === undefined || title === null || title.trim() === '') {
      throw new Error('Note title cannot be empty');
    }
    if (title.length > NoteTitle.MAX_LENGTH) {
      throw new Error('Note title cannot exceed ${NoteTitle.MAX_LENGTH} characters');
    }
    this.#value = title.trim();
  }

  get value() {
    return this.#value;
  }

  equals(other) {
    if (!(other instanceof NoteTitle)) return false;
    return this.#value === other.#value;
  }
}

module.exports = NoteTitle;