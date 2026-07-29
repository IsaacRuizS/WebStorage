use("webstorage");

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "password_hash", "role", "created_at"],
      properties: {
        name: { bsonType: "string", minLength: 1 },
        email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
        password_hash: { bsonType: "string" },
        avatar_url: { bsonType: ["string", "null"] },
        role: { enum: ["user", "admin"] },
        storage: {
          bsonType: "object", properties: {
            used_bytes: { bsonType: "long" },
            limit_bytes: { bsonType: "long" }
          }
        },
        must_change_password: { bsonType: "bool" },
        created_at: { bsonType: "date" },
        active: { bsonType: "bool" }
      }
    }
  }
});
db.users.createIndex({ email: 1 }, { unique: true }); // login unico por correo

db.createCollection("sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "refresh_token", "created_at", "expires_at"],
      properties: {
        user_id: { bsonType: "objectId" },
        refresh_token: { bsonType: "string" },
        user_agent: { bsonType: ["string", "null"] },
        ip: { bsonType: ["string", "null"] },
        created_at: { bsonType: "date" },
        last_seen_at: { bsonType: ["date", "null"] },
        expires_at: { bsonType: "date" },
        active: { bsonType: "bool" }
      }
    }
  }
});
db.sessions.createIndex({ refresh_token: 1 }, { unique: true }); // token de sesion unico
db.sessions.createIndex({ user_id: 1, created_at: -1 }); // historial de ingresos del usuario
db.sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL: borra la sesion al expirar

db.createCollection("folders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "owner_id", "created_at"],
      properties: {
        name: { bsonType: "string", minLength: 1 },
        owner_id: { bsonType: "objectId" },
        parent_id: { bsonType: ["objectId", "null"] },
        path: { bsonType: "string" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: ["date", "null"] },
        in_trash: { bsonType: "bool" }
      }
    }
  }
});
db.folders.createIndex({ owner_id: 1, parent_id: 1 }); // navegar la jerarquia de carpetas
db.folders.createIndex({ owner_id: 1, name: 1 }); // buscar carpeta por nombre

db.createCollection("files", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "owner_id", "mime_type", "size_bytes", "storage_key", "created_at"],
      properties: {
        name: { bsonType: "string", minLength: 1 },
        owner_id: { bsonType: "objectId" },
        folder_id: { bsonType: ["objectId", "null"] },
        mime_type: { bsonType: "string" },
        extension: { bsonType: "string" },
        size_bytes: { bsonType: "long" },
        storage_key: { bsonType: "string" },
        current_version: { bsonType: "int" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: ["date", "null"] },
        favorite: { bsonType: "bool" },
        in_trash: { bsonType: "bool" },
        tags: { bsonType: "array", items: { bsonType: "string" } }
      }
    }
  }
});
db.files.createIndex({ owner_id: 1, folder_id: 1 }); // listar archivos por carpeta
db.files.createIndex({ owner_id: 1, mime_type: 1 }); // filtrar archivos por tipo
db.files.createIndex({ name: "text", tags: "text" }); // busqueda rapida por texto

db.createCollection("file_versions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["file_id", "version", "size_bytes", "storage_key", "created_at"],
      properties: {
        file_id: { bsonType: "objectId" },
        version: { bsonType: "int" },
        size_bytes: { bsonType: "long" },
        storage_key: { bsonType: "string" },
        author_id: { bsonType: "objectId" },
        created_at: { bsonType: "date" }
      }
    }
  }
});
db.file_versions.createIndex({ file_id: 1, version: -1 }, { unique: true }); // historial de versiones

db.createCollection("shares", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["resource_id", "resource_type", "owner_id", "permission", "created_at"],
      properties: {
        resource_id: { bsonType: "objectId" },
        resource_type: { enum: ["file", "folder"] },
        owner_id: { bsonType: "objectId" },
        shared_with: { bsonType: ["objectId", "null"] },
        permission: { enum: ["read", "write"] },
        link_token: { bsonType: ["string", "null"] },
        created_at: { bsonType: "date" },
        expires_at: { bsonType: ["date", "null"] }
      }
    }
  }
});
db.shares.createIndex({ owner_id: 1 }); // comparticiones que hizo el usuario
db.shares.createIndex({ link_token: 1 }, { unique: true, sparse: true }); // acceso por enlace publico
db.shares.createIndex({ shared_with: 1 }); // recursos compartidos conmigo

db.createCollection("access_requests", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["resource_id", "resource_type", "requester_id", "owner_id", "status", "created_at"],
      properties: {
        resource_id: { bsonType: "objectId" },
        resource_type: { enum: ["file", "folder"] },
        requester_id: { bsonType: "objectId" },
        owner_id: { bsonType: "objectId" },
        requested_permission: { enum: ["read", "write"] },
        status: { enum: ["pending", "approved", "rejected"] },
        message: { bsonType: ["string", "null"] },
        created_at: { bsonType: "date" },
        responded_at: { bsonType: ["date", "null"] }
      }
    }
  }
});
db.access_requests.createIndex({ owner_id: 1, status: 1, created_at: -1 }); // solicitudes recibidas por estado
db.access_requests.createIndex({ requester_id: 1, status: 1 }); // mis solicitudes enviadas
db.access_requests.createIndex(
  { resource_id: 1, requester_id: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
); // evita solicitudes pendientes duplicadas

db.createCollection("comments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["file_id", "author_id", "text", "created_at"],
      properties: {
        file_id: { bsonType: "objectId" },
        author_id: { bsonType: "objectId" },
        text: { bsonType: "string", minLength: 1 },
        created_at: { bsonType: "date" },
        resolved: { bsonType: "bool" }
      }
    }
  }
});
db.comments.createIndex({ file_id: 1, created_at: -1 }); // comentarios de un archivo

db.createCollection("activity_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "action", "created_at"],
      properties: {
        user_id: { bsonType: "objectId" },
        action: {
          enum: ["login", "logout", "upload", "download", "delete",
            "share", "rename", "move", "restore"]
        },
        resource_id: { bsonType: ["objectId", "null"] },
        resource_type: { bsonType: ["string", "null"] },
        ip: { bsonType: ["string", "null"] },
        created_at: { bsonType: "date" }
      }
    }
  }
});
db.activity_logs.createIndex({ user_id: 1, created_at: -1 }); // actividad reciente del usuario

db.createCollection("notifications", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "type", "message", "created_at"],
      properties: {
        user_id: { bsonType: "objectId" },
        type: { enum: ["share", "comment", "system", "storage", "access_request"] },
        message: { bsonType: "string" },
        read: { bsonType: "bool" },
        created_at: { bsonType: "date" }
      }
    }
  }
});
db.notifications.createIndex({ user_id: 1, read: 1, created_at: -1 }); // notificaciones no leidas

db.createCollection("tags", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["owner_id", "name"],
      properties: {
        owner_id: { bsonType: "objectId" },
        name: { bsonType: "string", minLength: 1 },
        color: { bsonType: "string" }
      }
    }
  }
});
db.tags.createIndex({ owner_id: 1, name: 1 }, { unique: true }); // etiqueta unica por usuario

db.createCollection("trash", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["resource_id", "resource_type", "owner_id", "deleted_at", "purge_at"],
      properties: {
        resource_id: { bsonType: "objectId" },
        resource_type: { enum: ["file", "folder"] },
        owner_id: { bsonType: "objectId" },
        original_path: { bsonType: "string" },
        deleted_at: { bsonType: "date" },
        purge_at: { bsonType: "date" }
      }
    }
  }
});
db.trash.createIndex({ owner_id: 1, deleted_at: -1 }); // papelera del usuario
db.trash.createIndex({ purge_at: 1 }, { expireAfterSeconds: 0 }); // TTL: purga definitiva
