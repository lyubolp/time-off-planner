/// <reference path="../pb_data/types.d.ts" />

migrate(
  (db) => {
    const collections = [
      {
        name: "holidays",
        type: "base",
        schema: [
          { name: "date", type: "date", required: true, options: { min: "", max: "" } },
          { name: "title", type: "text", required: true, options: { min: 1, max: 120, pattern: "" } },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      },
      {
        name: "time_offs",
        type: "base",
        schema: [
          { name: "title", type: "text", required: true, options: { min: 1, max: 120, pattern: "" } },
          { name: "start_date", type: "date", required: true, options: { min: "", max: "" } },
          { name: "end_date", type: "date", required: true, options: { min: "", max: "" } },
          { name: "total_days", type: "number", required: true, options: { min: 0, max: 365, noDecimal: true } },
          { name: "planned_days", type: "number", required: true, options: { min: 0, max: 365, noDecimal: true } },
          { name: "taken_days", type: "number", required: true, options: { min: 0, max: 365, noDecimal: true } },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      },
      {
        name: "app_settings",
        type: "base",
        schema: [
          { name: "yearly_allowance", type: "number", required: true, options: { min: 0, max: 365, noDecimal: true } },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      },
    ];

    for (const def of collections) {
      const collection = new Collection(def);
      db.save(collection);
    }
  },
  (db) => {
    for (const name of ["holidays", "time_offs", "app_settings"]) {
      const collection = db.findCollectionByNameOrId(name);
      db.delete(collection);
    }
  }
);
