# to-topojson

Most geo converters stop at GeoJSON, so you need to multiple codes together to convert to TopoJSON. This eliminates the extra step.

Helps with:

* Detecting file formats
* Best TopoJSON settings (including: keeping GeoJSON properties)
* Adding labels (using MapBox Turf.js)

Supports:

* GeoJSON using Mike Bostock's topojson module
* KML and GPX using MapBox's togeojson module
* Shapefiles using Calvin Metcalf's shpjs module

## Functions

```javascript
// detect file format and output TopoJSON
convertFile(input_file, tj_file, function (err) {
}, optional_logger);

// optional_logger can be console.log or another function for updates

// set format and output TopoJSON
convertFileWithFormat(input_file, 'GeoJSON', tj_file, function (err) {
}, optional_logger);
// acceptable strings: GeoJSON, SHP, KML, GPX (default is GeoJSON)

convertObject(geojson_object, function (err, topojson_object) {
  // returns error or TopoJSON object
}, optional_logger);

labelGeoJSON(geojson_object_or_filename, label_filename, function (err) {
  // returns error or null
});
```

## License

MIT License
