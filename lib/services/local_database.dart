import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

class HistoryRecord {
  final int? id;
  final String type;
  final DateTime createdAt;
  final String title;
  final String detail;
  final String advice;
  final double confidence;
  final String? imagePath;

  const HistoryRecord({
    this.id,
    required this.type,
    required this.createdAt,
    required this.title,
    required this.detail,
    required this.advice,
    required this.confidence,
    this.imagePath,
  });

  Map<String, Object?> toMap() => {
        'id': id,
        'type': type,
        'created_at': createdAt.toIso8601String(),
        'title': title,
        'detail': detail,
        'advice': advice,
        'confidence': confidence,
        'image_path': imagePath,
      };

  factory HistoryRecord.fromMap(Map<String, Object?> map) => HistoryRecord(
        id: map['id'] as int?,
        type: map['type'] as String,
        createdAt: DateTime.parse(map['created_at'] as String),
        title: map['title'] as String,
        detail: map['detail'] as String,
        advice: map['advice'] as String,
        confidence: (map['confidence'] as num).toDouble(),
        imagePath: map['image_path'] as String?,
      );
}

class LocalDatabase {
  Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    final root = await getDatabasesPath();
    _database = await openDatabase(
      p.join(root, 'smart_village.db'),
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('crop', 'health')),
            created_at TEXT NOT NULL,
            title TEXT NOT NULL,
            detail TEXT NOT NULL,
            advice TEXT NOT NULL,
            confidence REAL NOT NULL DEFAULT 0,
            image_path TEXT
          )
        ''');
        await db.execute(
            'CREATE INDEX idx_history_created_at ON history(created_at DESC)');
        await db.execute('CREATE INDEX idx_history_type ON history(type)');
      },
    );
    return _database!;
  }

  Future<int> insert(HistoryRecord record) async {
    final db = await database;
    return db.insert('history', record.toMap()..remove('id'));
  }

  Future<List<HistoryRecord>> list({String? type}) async {
    final db = await database;
    final rows = await db.query(
      'history',
      where: type == null ? null : 'type = ?',
      whereArgs: type == null ? null : [type],
      orderBy: 'created_at DESC',
    );
    return rows.map(HistoryRecord.fromMap).toList();
  }

  Future<void> delete(int id) async {
    final db = await database;
    await db.delete('history', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> close() async {
    await _database?.close();
    _database = null;
  }
}
