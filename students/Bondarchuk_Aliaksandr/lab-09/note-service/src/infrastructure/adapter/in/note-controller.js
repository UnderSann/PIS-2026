// src/infrastructure/adapter/in/note-controller.js

const express = require('express');
const { CreateNoteCommand } = require('../../../application/port/in/create-note-use-case');
const { GetNoteQuery } = require('../../../application/port/in/get-note-use-case');
const { UpdateNoteCommand } = require('../../../application/port/in/update-note-use-case');
const { DeleteNoteCommand } = require('../../../application/port/in/delete-note-use-case');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

class NoteController {
  constructor(noteService) {
    this.noteService = noteService;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post('/api/notes', upload.single('file'), this.createNote.bind(this));
    this.router.get('/api/notes/:id', this.getNote.bind(this));
    this.router.put('/api/notes/:id', upload.single('file'), this.updateNote.bind(this));
    this.router.delete('/api/notes/:id', this.deleteNote.bind(this));
  }

  async createNote(req, res) {
    try {
      const command = new CreateNoteCommand(
        req.body.userId,           // ownerId
        req.body.title,            // title
        req.file.buffer            // fileContent
      );
      
      const note = await this.noteService.execute(command);
      
      res.status(201).json({
        id: note.id,
        title: note.title,
        version: note.version,
        createdAt: note.createdAt
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getNote(req, res) {
    try {
      const query = new GetNoteQuery(
        req.params.id,    // noteId
        req.query.userId  // userId
      );
      
      const note = await this.noteService.execute(query);
      
      res.json({
        id: note.id,
        ownerId: note.ownerId,
        title: note.title,
        content: note.content,
        version: note.version,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      });
    } catch (error) {
      if (error.name === 'NoteNotFoundException') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(403).json({ error: error.message });
      }
    }
  }

  async updateNote(req, res) {
    try {
      const command = new UpdateNoteCommand(
        req.params.id,              // noteId
        req.body.userId,            // userId
        req.body.title,             // title (может быть undefined)
        req.file ? req.file.buffer : null // fileContent (может быть null)
      );
      
      const note = await this.noteService.execute(command);
      
      res.json({
        id: note.id,
        title: note.title,
        version: note.version,
        updatedAt: note.updatedAt
      });
    } catch (error) {
      if (error.name === 'NoteNotFoundException') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(403).json({ error: error.message });
      }
    }
  }

  async deleteNote(req, res) {
    try {
      const command = new DeleteNoteCommand(
        req.params.id,    // noteId
        req.body.userId   // userId
      );
      
      await this.noteService.execute(command);
      
      res.status(204).send();
    } catch (error) {
      if (error.name === 'NoteNotFoundException') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(403).json({ error: error.message });
      }
    }
  }
}

module.exports = NoteController;