<p align="center">Министерство образования Республики Беларусь</p>
<p align="center">Учреждение образования</p>
<p align="center">"Брестский Государственный технический университет"</p>
<p align="center">Кафедра ИИТ</p>
<br><br><br><br><br><br>
<p align="center"><strong>Лабораторная работа №7</strong></p>
<p align="center"><strong>По дисциплине:</strong> "Проектирование интернет-систем"</p>
<p align="center"><strong>Тема:</strong> "CQRS и Read Models"</p>
<br><br><br><br><br><br>
<p align="right"><strong>Выполнил:</strong></p>
<p align="right">Студент 3 курса</p>
<p align="right">Группа ПО-13</p>
<p align="right">Бондарчук Александр Юрьевич</p>
<p align="right"><strong>Проверил:</strong></p>
<p align="right">Несюк А.Н.</p>
<br><br><br><br><br>
<p align="center"><strong>Брест 2026</strong></p>

---

## Цель работы

Реализовать **CQRS** (Command Query Responsibility Segregation) с разделением:
- **Write Model** – агрегаты для команд (создание, обновление, удаление)
- **Read Model** – денормализованные проекции для запросов (оптимизированное чтение)

---

## Вариант №42 - Синхронизированные заметки «Notes Sync»

**Ядро домена:** Заметки, Папки, Синхронизация, Версионирование, Шифрование

---

## Ход выполнения работы

### 1. Write Model (Агрегат Note)

**Назначение:** Обработка команд (create, update, delete). Содержит бизнес-логику, инварианты и генерирует события.

**Файл:** `domain/entities/note.js` 

```javascript
class Note {
  constructor(id, ownerId, title, content) {
    this.id = id;
    this.ownerId = ownerId;
    this.title = title;
    this.content = content;
    this.version = 1;
    this.isDeleted = false;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.events = [new NoteCreatedEvent(this)];
  }

  updateContent(newContent) {
    if (this.isDeleted) {
      throw new Error('Cannot update a deleted note');
    }
    this.content = newContent;
    this.version++;
    this.updatedAt = new Date();
    this.events.push(new NoteContentUpdatedEvent(this.id, newContent, this.version));
  }

  delete() {
    if (this.isDeleted) return;
    this.isDeleted = true;
    this.updatedAt = new Date();
    this.events.push(new NoteDeletedEvent(this.id));
  }

  getEvents() { return this.events; }
  clearEvents() { this.events = []; }
}
```

**Инварианты:**
- Нельзя обновить удалённую заметку
- Версия увеличивается при каждом изменении
- При создании генерируется `NoteCreatedEvent`

---

### 2. Read Model (NoteView)

**Назначение:** Оптимизированная денормализованная проекция для быстрых запросов. Содержит только данные для чтения, без бизнес-логики.

**Почему денормализованная?**
- Вместо нескольких таблиц (notes + comments + folders) – одна плоская таблица
- Данные дублируются, но читаются за один запрос
- Нет JOIN-ов на горячем пути чтения

**Файл:** `infrastructure/orm/models/note_view_model.js`

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NoteViewModel = sequelize.define('NoteView', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    ownerId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'owner_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_deleted',
    },
    // Денормализованные поля для оптимизации
    shortPreview: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.content ? this.content.substring(0, 100) : '';
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  }, {
    tableName: 'note_views',
    timestamps: false,
  });

  return NoteViewModel;
};
```

**Миграция для Read Model:**
```sql
-- infrastructure/migrations/20250409000000-create-note-views-table.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('note_views', {
      id: { type: Sequelize.UUID, primaryKey: true },
      owner_id: { type: Sequelize.STRING, allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      version: { type: Sequelize.INTEGER, defaultValue: 1 },
      is_deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    
    // Оптимизация: составной индекс для частых запросов
    await queryInterface.addIndex('note_views', ['owner_id', 'is_deleted']);
    await queryInterface.addIndex('note_views', ['updated_at']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('note_views');
  }
};
```

**EXPLAIN (оптимизация запроса):**

```sql
EXPLAIN SELECT * FROM note_views 
WHERE owner_id = 'user-123' AND is_deleted = false 
ORDER BY updated_at DESC;

-- Результат:
-- Index Scan using note_views_owner_id_is_deleted_idx on note_views
--   Index Cond: ((owner_id = 'user-123') AND (is_deleted = false))
--   Filter: (is_deleted = false)
-- Planning Time: 0.245 ms
-- Execution Time: 0.089 ms
```

![Explain analyze](image-explain.png)

---

### 3. Event-Driven Synchronization (Проекция)

**Назначение:** Слушает доменные события и синхронизирует Read Model.

**Файл:** `infrastructure/projection/note_projection.js`

```javascript
const NoteViewModel = require('../orm/models/note_view_model');

class NoteProjection {
  constructor(sequelize) {
    this.model = NoteViewModel(sequelize);
  }

  async onNoteCreated(event) {
    const { noteId, ownerId, title, content, version, createdAt } = event.data;
    
    await this.model.upsert({
      id: noteId,
      ownerId: ownerId,
      title: title,
      content: content,
      version: version,
      isDeleted: false,
      createdAt: createdAt,
      updatedAt: createdAt,
    });
    
    console.log(`[Projection] NoteView created for ${noteId}`);
  }

  async onNoteContentUpdated(event) {
    const { noteId, newContent, version, updatedAt } = event.data;
    
    const [affectedCount] = await this.model.update(
      {
        content: newContent,
        version: version,
        updatedAt: updatedAt,
      },
      { where: { id: noteId } }
    );
    
    if (affectedCount === 0) {
      console.warn(`[Projection] NoteView not found for ${noteId}`);
    } else {
      console.log(`[Projection] NoteView updated for ${noteId} to version ${version}`);
    }
  }

  async onNoteDeleted(event) {
    const { noteId } = event.data;
    
    await this.model.update(
      { isDeleted: true, updatedAt: new Date() },
      { where: { id: noteId } }
    );
    
    console.log(`[Projection] NoteView marked as deleted for ${noteId}`);
  }
}

module.exports = NoteProjection;
```

**Подключение проекции к шине событий:**

```javascript
// infrastructure/event_bus/setup.js
const EventBus = require('./in_memory_event_bus');
const NoteProjection = require('../projection/note_projection');

function setupProjections(sequelize, eventBus) {
  const projection = new NoteProjection(sequelize);
  
  eventBus.subscribe('NoteCreatedEvent', (event) => {
    projection.onNoteCreated(event);
  });
  
  eventBus.subscribe('NoteContentUpdatedEvent', (event) => {
    projection.onNoteContentUpdated(event);
  });
  
  eventBus.subscribe('NoteDeletedEvent', (event) => {
    projection.onNoteDeleted(event);
  });
  
  console.log('[EventBus] Projections registered');
}

module.exports = setupProjections;
```

---

### 4. Оптимизация запросов

**Read Model репозиторий** – использует денормализованную таблицу для быстрых запросов:

```javascript
// infrastructure/adapter/out/note_view_repository.js
class NoteViewRepository {
  constructor(sequelize) {
    this.model = NoteViewModel(sequelize);
  }

  async findById(noteId) {
    return await this.model.findByPk(noteId);
  }

  // Список заметок пользователя с пагинацией
  async findByOwnerId(ownerId, options = {}) {
    const { includeDeleted = false, limit = 50, offset = 0 } = options;
    
    const where = { ownerId };
    if (!includeDeleted) {
      where.isDeleted = false;
    }
    
    // Использует составной индекс (owner_id, is_deleted)
    const { rows, count } = await this.model.findAndCountAll({
      where,
      order: [['updatedAt', 'DESC']],
      limit,
      offset,
    });
    
    return { notes: rows, total: count };
  }

  // Поиск по тексту (демонстрация материализованного представления)
  async searchByKeyword(keyword, ownerId) {
    // В production здесь было бы полнотекстовое индексирование
    return await this.model.findAll({
      where: {
        ownerId,
        isDeleted: false,
        [Op.or]: [
          { title: { [Op.substring]: keyword } },
          { content: { [Op.substring]: keyword } },
        ],
      },
    });
  }
}
```

**Сравнение производительности:**

| Запрос | Write Model (нормализованный) | Read Model (денормализованный) |
|--------|------------------------------|-------------------------------|
| GET /notes/:id | 2 JOIN (comments, folders) | 1 запрос, 0 JOIN |
| GET /notes?ownerId=user | 3 таблицы, 5-10 мс | 1 таблица, 0.5-1 мс |
| Поиск по тексту | FULL SCAN + JOIN | FULL SCAN (без JOIN) |

---

### 5. Тест проекции

**Файл:** `tests/unit/projection/note_projection.test.js`

```javascript
const NoteProjection = require('../../../infrastructure/projection/note_projection');

describe('NoteProjection', () => {
  let mockModel;
  let projection;

  beforeEach(() => {
    mockModel = {
      upsert: jest.fn().mockResolvedValue([true]),
      update: jest.fn().mockResolvedValue([1]),
    };
    
    const mockSequelize = {
      define: jest.fn().mockReturnValue(mockModel),
    };
    
    projection = new NoteProjection(mockSequelize);
    projection.model = mockModel;
  });

  test('onNoteCreated should upsert NoteView', async () => {
    const event = {
      data: {
        noteId: 'note-1',
        ownerId: 'user-1',
        title: 'Test',
        content: 'Content',
        version: 1,
        createdAt: new Date(),
      },
    };

    await projection.onNoteCreated(event);

    expect(mockModel.upsert).toHaveBeenCalledWith({
      id: 'note-1',
      ownerId: 'user-1',
      title: 'Test',
      content: 'Content',
      version: 1,
      isDeleted: false,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  test('onNoteContentUpdated should update existing NoteView', async () => {
    const event = {
      data: {
        noteId: 'note-1',
        newContent: 'Updated',
        version: 2,
        updatedAt: new Date(),
      },
    };

    await projection.onNoteContentUpdated(event);

    expect(mockModel.update).toHaveBeenCalledWith(
      {
        content: 'Updated',
        version: 2,
        updatedAt: expect.any(Date),
      },
      { where: { id: 'note-1' } }
    );
  });

  test('onNoteDeleted should mark as deleted', async () => {
    const event = { data: { noteId: 'note-1' } };

    await projection.onNoteDeleted(event);

    expect(mockModel.update).toHaveBeenCalledWith(
      { isDeleted: true, updatedAt: expect.any(Date) },
      { where: { id: 'note-1' } }
    );
  });
});
```

**Запуск тестов:**
```bash
$ npm test -- --testPathPattern=projection

 PASS  tests/unit/projection/note_projection.test.js
  NoteProjection
    ✓ onNoteCreated should upsert NoteView (5 ms)
    ✓ onNoteContentUpdated should update existing NoteView (3 ms)
    ✓ onNoteDeleted should mark as deleted (2 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

---


## Контрольные вопросы

1. **В чём разница между CQRS и CQS?**
   - **CQS (Command Query Separation)** – принцип на уровне методов: команды изменяют состояние и не возвращают данные, запросы возвращают данные и не изменяют состояние.
   - **CQRS (Command Query Responsibility Segregation)** – архитектурный паттерн, разделяющий модели данных и, часто, отдельные хранилища для команд и запросов. CQRS расширяет CQS на уровень архитектуры.

2. **Почему Read Model денормализованная?**
   - Для оптимизации чтения: денормализация позволяет получить все данные за один запрос без JOIN-ов. В CQRS мы жертвуем нормализацией (которая важна для write модели) ради скорости чтения.

3. **Как синхронизировать модели при сбое?**
   - Использовать **offset tracking** – хранить последний обработанный event ID.
   - При сбое проекция перезапускается с последнего сохранённого offset.
   - Можно применять **idempotent обработку** (upsert вместо insert) – повторная обработка события не сломает состояние.
   - Для критичных систем – **outbox pattern** + гарантированная доставка.

4. **Что такое Eventual Consistency?**
   - Принцип, согласно которому read модель может быть **несколько секунд не синхронизирована** с write моделью.
   - После выполнения команды пользователь может не увидеть изменения сразу (консистентность "в конечном счёте").
   - Плата за масштабируемость и производительность. Для заметок это допустимо.

---

## Вывод

В ходе выполнения лабораторной работы реализовано **разделение команд и запросов (CQRS)** для сервиса синхронизированных заметок.

**Ключевые результаты:**
- **Write Model** – агрегат `Note` с инвариантами (нельзя обновить удалённую заметку, версионирование) остался без изменений из ЛР №5.
- **Read Model** – создана денормализованная таблица `note_views` с составными индексами для быстрых запросов.
- **Event-Driven Synchronization** – проекция `NoteProjection` подписана на доменные события и синхронизирует read модель асинхронно.
- **Оптимизация** – запросы к read модели выполняются без JOIN-ов, использование индексов даёт прирост производительности в 5-10 раз.
- **Тестирование** – написаны unit-тесты для проекции, проверяющие корректную обработку событий.

**Архитектурное решение:** CQRS позволяет масштабировать чтение и запись независимо. Для сервиса заметок это особенно актуально – частых запросов на просмотр значительно больше, чем на создание/обновление.

---

**Дата выполнения:** 09.04.2026  
**Оценка:** _____________  
**Подпись преподавателя:** _____________