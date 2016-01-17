/* to-topojson */

const fs = require('fs');
const topojson = require('topojson');
const converters = require('geoconverters');
const convertTopoJSONtoGeoJSON = converters.convertTopoJSONtoGeoJSON;
const convertKMLtoGeoJSON = converters.convertKMLtoGeoJSON;
const convertSHPtoGeoJSON = converters.convertSHPtoGeoJSON;
const convertGeoJSONtoTopoJSON = converters.convertGeoJSONtoTopoJSON;

function convertFile (filename, tj_file, callback, logger) {
  // optional logger
  if (typeof logger !== 'function') {
    logger = function() {
    };
  }

  // detect file type
  var fnamer = filename.toLowerCase();

  // TopoJSON file detect
  var format = null;
  if (fnamer.indexOf('topojson') > -1 || fnamer.indexOf('topo.json') > -1) {
    format = 'TopoJSON';
  } else if (fnamer.indexOf('geojson') > -1 || fnamer.indexOf('geo.json') > -1) {
    format = 'GeoJSON';
  } else if (fnamer.indexOf('kml') > -1) {
    format = 'KML';
  } else if (fnamer.indexOf('kmz') > -1) {
    // KMZ zipping?
    callback('Rename your KMZ file to ZIP, and extract out the KML file.');
  } else if (fnamer.indexOf('.shp') > -1) {
    format = 'SHP';
  }

  if (format) {
    convertFileWithFormat(filename, format, tj_file, callback, logger);
  } else {
    callback('Didn\'t recognize file extension / format.');
  }
}

function convertFileWithFormat (filename, format, tj_file, callback, logger) {
  // optional logger
  if (typeof logger !== 'function') {
    logger = function() {
    };
  }

  // format is not case-sensitive
  format = format.toLowerCase();

  if (fs.existsSync(filename)) {
    if (format === 'topojson') {
      logger('copying TopoJSON file');

      // sourced from StackOverflow
      // http://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
      function copyFile(source, target, cb) {
        var cbCalled = false;

        var rd = fs.createReadStream(source);
        rd.on("error", function(err) {
          done(err);
        });
        var wr = fs.createWriteStream(target);
        wr.on("error", function(err) {
          done(err);
        });
        wr.on("close", function(ex) {
          done();
        });
        rd.pipe(wr);

        function done(err) {
          if (!cbCalled) {
            cb(err);
            cbCalled = true;
          }
        }
      }
      copyFile(filename, tj_file, function (err) {
        callback(err || null);
      });

    // GeoJSON files can be made smaller using TopoJSON
    } else if (format === 'geojson') {
      logger('converting GeoJSON to TopoJSON');
      convertGeoJSONtoTopoJSON(filename, tj_file, function(err) {
        callback(err || null);
      });

    // KML using MapBox's togeojson module
    } else if (format === 'kml') {
      logger('converting KML to GeoJSON');
      convertKMLtoGeoJSON(filename, 'mapdata.geojson', function (err) {
        if (err) {
          return callback(err);
        }
        convertFileWithFormat('mapdata.geojson', 'GeoJSON', tj_file, callback, logger);
      });

    // shapefiles converted using Calvin Metcalf's shpjs
    } else if (format === 'shp') {
      logger('converting shapefile to GeoJSON');
      if (filename.toLowerCase().indexOf('.shp') === filename.length - 4) {
        filename = filename.substring(0, fnamer.indexOf('.shp'));
      }
      convertSHPtoGeoJSON(filename, 'mapdata.geojson', function (err) {
        if (err) {
          return callback(err);
        }
        convertFileWithFormat('mapdata.geojson', 'GeoJSON', tj_file, callback, logger);
      });
    } else {
      callback('Didn\'t recognize file extension / format.');
    }
  } else {
    callback('Filename ' + filename + ' does not exist');
  }
}

function convertObject(gj, callback) {
  if (typeof gj !== 'object') {
    // might still be a string; no problem
    try {
      gj_object = JSON.stringify(gj_object);
    } catch(e) {
      return callback(e);
    }
  }
  var tj = topojson.topology({ geo: gj }, {
    'verbose': true,
    'pre-quantization': 1000000,
    'post-quantization': 10000,
    'coordinate-system': 'auto',
    'stitch-poles': true,
    'minimum-area': 0,
    'preserve-attached': true,
    'retain-proportion': 0,
    'force-clockwise': false,
    'property-transform': function (feature) {
      return feature.properties;
    }
  });
  callback(null, tj);
}

module.exports = {
  convertFile: convertFile,
  convertFileWithFormat: convertFileWithFormat,
  convertObject: convertObject
};
