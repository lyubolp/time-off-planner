/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1030130889")

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number1092752022",
    "max": 365,
    "min": 0,
    "name": "taken_days",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1030130889")

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number1092752022",
    "max": 365,
    "min": 0,
    "name": "taken_days",
    "onlyInt": true,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
