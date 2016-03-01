/* to-topojson */

const fs = require('fs');

const centroid = require('turf-centroid');

const topojson = require('topojson');
const converters = require('geoconverters');
const convertTopoJSONtoGeoJSON = converters.convertTopoJSONtoGeoJSON;
const convertKMLtoGeoJSON = converters.convertKMLtoGeoJSON;
const convertSHPtoGeoJSON = converters.convertSHPtoGeoJSON;
const convertGeoJSONtoTopoJSON = converters.convertGeoJSONtoTopoJSON;

function convertFile (filename, tj_file, callback, logger, saveLabels) {
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
    return callback('Rename your KMZ file to ZIP, and extract out the KML file.');
  } else if (fnamer.indexOf('.shp') > -1) {
    format = 'SHP';
  }

  if (format) {
    convertFileWithFormat(filename, format, tj_file, callback, logger, saveLabels);
  } else {
    callback('Didn\'t recognize file extension / format.');
  }
}

function convertFileWithFormat (filename, format, tj_file, callback, logger, saveLabels) {
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
      fs.readFile(filename, { encoding: 'utf-8' }, function(err, data) {
        if (err) {
          return callback(err);
        }
        var tj = JSON.parse(data);
        fs.write('mapdata.topojson', JSON.stringify(tj), function(err) {
          if (err) {
            return callback(err);
          }
          logger('making GeoJSON copy at mapdata.geojson');
          var key = Object.keys(tj.objects)[0];
          var gj = topojson.feature(tj, tj.objects[key]);
          fs.write('mapdata.geojson', JSON.stringify(gj), function(err) {
            if (err) {
              return callback(err);
            }
            if (saveLabels) {
              logger('saving GeoJSON labels');
              labelGeoJSON(gj, 'maplabels.geojson', function(err) {
                callback(err);
              });
            } else {
              callback();
            }
          });
        });
      });

    // GeoJSON files can be made smaller using TopoJSON
    } else if (format === 'geojson') {
      logger('converting GeoJSON to TopoJSON');
      convertGeoJSONtoTopoJSON(filename, tj_file, function(err) {
        if (err) {
          return callback(err);
        }
        if (saveLabels) {
          logger('saving GeoJSON labels');
          labelGeoJSON(filename, 'maplabels.geojson', function(err) {
            callback(err);
          });
        } else {
          callback();
        }
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
    'verbose': false,
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

function labelGeoJSON(source, result, callback) {
  var gjlabel = function(gj) {
    var labels = {
      type: 'FeatureCollection',
      features: []
    };
    var featurelabel = function(f) {
      try {
        var center = centroid(f);
        if (center) {
          center.properties = f.properties;
          labels.features.push(center);
        }
      } catch(e) {
        console.log(e);
      }
    };

    if (gj.type === 'Feature') {
      // single Feature
      featurelabel(gj);
    } else {
      // FeatureCollection
      for (var a = 0; a < gj.features.length; a++) {
        featurelabel(gj.features[a]);
      }
    }
    fs.writeFile(result, JSON.stringify(labels), function (err) {
      callback(err);
    });
  };

  if (typeof source === 'object') {
    // direct GeoJSON object
    gjlabel(source);
  } else {
    // filename
    fs.readFile(source, { encoding: 'utf-8' }, function(err, data) {
      if (err) {
        return callback(err);
      }
      gjlabel(JSON.parse(data));
    });
  }
}

module.exports = {
  convertFile: convertFile,
  convertFileWithFormat: convertFileWithFormat,
  convertObject: convertObject,
  labelGeoJSON: labelGeoJSON
};
