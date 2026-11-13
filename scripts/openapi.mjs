import { writeFileSync } from "node:fs";
import { z } from "zod";
import { modules, readRoles } from "../backend/src/validators/modules.js";
const doc = {
  openapi: "3.1.0",
  info: {
    title: "SocietyOS API",
    version: "1.0.0",
    description:
      "Express API. Local HttpOnly session cookies or Supabase bearer tokens; X-Society-Id selects a membership. Table visibility and actions are role-scoped.",
  },
  servers: [{ url: "http://localhost:4000/api" }],
  security: [{ session: [] }, { bearer: [] }],
  components: {
    securitySchemes: {
      session: { type: "apiKey", in: "cookie", name: "session" },
      bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    parameters: {
      society: {
        name: "X-Society-Id",
        in: "header",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    },
    schemas: {},
  },
  paths: {},
};
const response = {
  200: { description: "Success" },
  400: { description: "Validation error" },
  401: { description: "Authentication required" },
  403: { description: "Role or tenant denied" },
  404: { description: "Record not found" },
  409: { description: "Conflict or invalid state" },
};
for (const [name, roles] of Object.entries(readRoles)) {
  doc.paths["/" + name] = {
    get: {
      summary: "List " + name,
      description:
        "Visible to " +
        roles.join(", ") +
        ". Newest 500 records; resident and assigned-staff restrictions apply.",
      parameters: [{ $ref: "#/components/parameters/society" }],
      responses: response,
    },
  };
  if (modules[name]) {
    doc.components.schemas[name] = z.toJSONSchema(
      z.object(modules[name].fields).strict(),
    );
    doc.paths["/" + name].post = {
      summary: "Create " + name,
      description: "Allowed roles: " + modules[name].roles.join(", "),
      parameters: [{ $ref: "#/components/parameters/society" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/" + name },
          },
        },
      },
      responses: { ...response, 201: { description: "Created" } },
    };
  }
  doc.paths["/" + name + "/export"] = {
    get: {
      summary: "Export role-visible " + name + " as CSV",
      responses: {
        ...response,
        200: {
          description: "CSV",
          content: { "text/csv": { schema: { type: "string" } } },
        },
      },
    },
  };
}
for (const [path, method, summary, properties] of [
  ["/health", "get", "Database health", null],
  ["/auth/config", "get", "Authentication provider configuration", null],
  ["/auth/me", "get", "Current user and memberships", null],
  [
    "/auth/login",
    "post",
    "Local password login",
    {
      email: { type: "string", format: "email" },
      password: { type: "string" },
    },
  ],
  [
    "/auth/signup",
    "post",
    "Local signup and society",
    {
      name: { type: "string" },
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 10 },
      society: { type: "string" },
    },
  ],
  ["/auth/logout", "post", "Revoke local session", {}],
  [
    "/auth/onboard",
    "post",
    "Create a society",
    {
      name: { type: "string" },
      address: { type: "string" },
      plan: { enum: ["starter", "community", "estate"] },
    },
  ],
  [
    "/auth/join",
    "post",
    "Accept invitation",
    { token: { type: "string", minLength: 64, maxLength: 64 } },
  ],
  ["/auth/profile", "patch", "Update own name", { name: { type: "string" } }],
  ["/auth/preferences", "get", "Get notification preferences", null],
  [
    "/auth/preferences",
    "patch",
    "Update notification preferences",
    { updates: { type: "boolean" } },
  ],
  [
    "/invitations",
    "post",
    "Create invitation",
    {
      email: { type: "string", format: "email" },
      role: { enum: ["admin", "resident", "guard", "maintenance"] },
    },
  ],
  ["/members", "get", "Society directory", null],
  [
    "/members/{id}",
    "patch",
    "Update society role",
    { role: { enum: ["admin", "resident", "guard", "maintenance"] } },
  ],
  ["/members/{id}", "delete", "Remove society membership", null],
  ["/staff", "get", "Maintenance staff", null],
  ["/settings", "get", "Society configuration", null],
  [
    "/settings",
    "patch",
    "Update society",
    {
      name: { type: "string" },
      address: { type: "string" },
      plan: { enum: ["starter", "community", "estate"] },
    },
  ],
  ["/analytics", "get", "Role-specific overview aggregates", null],
  [
    "/reports",
    "get",
    "Admin aggregates; optional from/to ISO date query",
    null,
  ],
  ["/reminders", "post", "Run society reminders", {}],
  [
    "/jobs/reminders",
    "post",
    "CRON_SECRET bearer authentication; all society reminders",
    {},
  ],
  [
    "/visitors/verify",
    "post",
    "Check visitor in or out",
    { token: { type: "string" }, exit: { type: "boolean" } },
  ],
  [
    "/invoices/{id}/payments",
    "post",
    "Submit manual payment",
    {
      amount_cents: { type: "integer", minimum: 1 },
      reference: { type: "string" },
    },
  ],
  ["/invoices/{id}/pdf", "get", "Download invoice PDF", null],
  [
    "/billing/monthly",
    "post",
    "Monthly occupied-unit invoice batch",
    {
      period: { type: "string", pattern: "^\\d{4}-(0[1-9]|1[0-2])$" },
      title: { type: "string" },
      amount_cents: { type: "integer" },
      extra_cents: { type: "integer" },
      due_at: { type: "string", format: "date-time" },
    },
  ],
  [
    "/polls",
    "post",
    "Create poll",
    {
      title: { type: "string" },
      ends_at: { type: "string", format: "date-time" },
      options: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 8,
      },
    },
  ],
  ["/polls/{id}/results", "get", "Poll options and aggregate results", null],
  [
    "/polls/{id}/vote",
    "post",
    "Vote once",
    { option_id: { type: "string", format: "uuid" } },
  ],
  ["/platform", "get", "Superadmin platform overview", null],
  [
    "/platform/{id}",
    "post",
    "Superadmin change society access",
    { status: { enum: ["active", "pending", "suspended"] } },
  ],
  [
    "/units/import",
    "post",
    "Import up to 200 units; per-row result",
    {
      rows: {
        type: "array",
        maxItems: 200,
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            building_id: { type: "string", format: "uuid" },
            floor_id: { type: "string", format: "uuid" },
          },
        },
      },
    },
  ],
  [
    "/complaints/{id}/comments",
    "get",
    "Read visible complaint conversation",
    null,
  ],
  ["/files/{id}", "get", "Download a protected file", null],
]) {
  doc.paths[path] ??= {};
  doc.paths[path][method] = {
    summary,
    parameters: [
      ...(path.includes("{id}")
        ? [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ]
        : []),
      ...(path.startsWith("/auth") || path === "/health"
        ? []
        : [{ $ref: "#/components/parameters/society" }]),
    ],
    responses: response,
    ...(properties
      ? {
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { type: "object", properties } },
            },
          },
        }
      : {}),
  };
}
for (const [table, actions] of Object.entries({
  complaints: ["assign", "start", "resolve", "close", "reopen", "comment"],
  payments: ["approve", "reject"],
  facility_bookings: ["approve", "reject", "cancel"],
  notifications: ["read"],
  visitor_passes: ["cancel"],
  feedback: ["close"],
  lost_found_reports: ["close"],
  security_incidents: ["close"],
  support_requests: ["close"],
})) {
  for (const action of actions) {
    const properties =
      action === "assign"
        ? { assigned_to: { type: "string", format: "uuid" } }
        : action === "comment"
          ? { body: { type: "string" } }
          : {};
    const op = {
      summary: action + " " + table,
      parameters: [
        { $ref: "#/components/parameters/society" },
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: response,
    };
    op.requestBody = {
      content: {
        "application/json": { schema: { type: "object", properties } },
      },
    };
    doc.paths[`/${table}/{id}/${action}`] = { post: op };
  }
}
for (const table of [
  "buildings",
  "floors",
  "units",
  "facilities",
  "announcements",
  "community_events",
  "emergency_contacts",
  "shifts",
])
  doc.paths[`/${table}/{id}`] = {
    patch: {
      summary: "Administrator edit " + table,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/" + table },
          },
        },
      },
      responses: response,
    },
  };
for (const table of [
  "buildings",
  "floors",
  "units",
  "unit_occupancies",
  "emergency_contacts",
  "shifts",
  "facilities",
  "community_events",
]) {
  doc.paths[`/${table}/{id}`] ??= {};
  doc.paths[`/${table}/{id}`].delete = {
    summary: "Remove unreferenced " + table,
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
    responses: response,
  };
}
const uploadSchema = {
  type: "object",
  required: ["file", "title"],
  properties: {
    file: { type: "string", format: "binary" },
    title: { type: "string" },
    entity_type: { enum: ["community", "complaint", "payment"] },
    entity_id: { type: "string" },
  },
};
doc.paths["/files"] = {
  post: {
    summary: "Upload protected PDF, PNG or JPEG (5 MB maximum)",
    responses: response,
    requestBody: {
      content: { "multipart/form-data": { schema: uploadSchema } },
    },
  },
};
doc.paths["/search"]={get:{summary:"Search role-visible tenant records",parameters:[{name:"q",in:"query",required:true,schema:{type:"string",minLength:2,maxLength:100}}],responses:response}};
doc.paths["/summary/{table}"]={get:{summary:"Role-scoped summary card values",parameters:[{name:"table",in:"path",required:true,schema:{type:"string"}}],responses:response}};
writeFileSync("docs/openapi.json", JSON.stringify(doc, null, 2));
console.log("OpenAPI generated:", Object.keys(doc.paths).length, "paths");
