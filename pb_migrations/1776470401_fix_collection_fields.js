/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Fix holidays collection
    const holidays = app.findCollectionByNameOrId("holidays");
    holidays.fields.add(new DateField({ name: "date", required: true }));
    holidays.fields.add(new TextField({ name: "title", required: true, min: 1, max: 120 }));
    app.save(holidays);

    // Fix time_offs collection
    const timeOffs = app.findCollectionByNameOrId("time_offs");
    timeOffs.fields.add(new TextField({ name: "title", required: true, min: 1, max: 120 }));
    timeOffs.fields.add(new DateField({ name: "start_date", required: true }));
    timeOffs.fields.add(new DateField({ name: "end_date", required: true }));
    timeOffs.fields.add(new NumberField({ name: "total_days", required: true, min: 0, max: 365, onlyInt: true }));
    timeOffs.fields.add(new NumberField({ name: "planned_days", required: true, min: 0, max: 365, onlyInt: true }));
    timeOffs.fields.add(new NumberField({ name: "taken_days", required: true, min: 0, max: 365, onlyInt: true }));
    app.save(timeOffs);

    // Fix app_settings collection
    const appSettings = app.findCollectionByNameOrId("app_settings");
    appSettings.fields.add(new NumberField({ name: "yearly_allowance", required: true, min: 0, max: 365, onlyInt: true }));
    app.save(appSettings);
  },
  (app) => {
    const holidays = app.findCollectionByNameOrId("holidays");
    holidays.fields.removeByName("date");
    holidays.fields.removeByName("title");
    app.save(holidays);

    const timeOffs = app.findCollectionByNameOrId("time_offs");
    timeOffs.fields.removeByName("title");
    timeOffs.fields.removeByName("start_date");
    timeOffs.fields.removeByName("end_date");
    timeOffs.fields.removeByName("total_days");
    timeOffs.fields.removeByName("planned_days");
    timeOffs.fields.removeByName("taken_days");
    app.save(timeOffs);

    const appSettings = app.findCollectionByNameOrId("app_settings");
    appSettings.fields.removeByName("yearly_allowance");
    app.save(appSettings);
  }
);
