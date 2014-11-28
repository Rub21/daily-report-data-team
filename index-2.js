var osmium = require('osmium');
var numeral = require('numeral');
var request = require('request');
var fs = require('fs');
var zlib = require('zlib');
var _ = require('underscore');

var pg = require('pg');
var conString = "postgres://postgres:1234@localhost/dbstatistic";
var client = new pg.Client(conString);
client.connect(function(err) {
	if (err) {
		return console.error('could not connect to postgres', err);
	}
});

var osm_users = ['Rub21', 'ediyes', 'Luis36995', 'RichRico', 'dannykath'];

var osm_file = '';

var obj = function() {
	return {
		osm_user: {
			osmuser: null,
			color: null
		},
		osm_date: {
			osmfile: null,
			osmdate: 0
		},
		osm_node: {
			v1: 0,
			vx: 0
		},
		osm_way: {
			v1: 0,
			vx: 0
		},
		osm_relation: {
			v1: 0,
			vx: 0
		}
	};
};



function format_num(n) {
	return numeral(n).format('0,0');
}

function download_file(url, localFile, callback) {
	console.log('Start download : ' + url);
	var localStream = fs.createWriteStream(localFile);
	var out = request({
		uri: url
	});
	out.on('response', function(resp) {
		if (resp.statusCode === 200) {
			out.pipe(zlib.createGunzip()).pipe(localStream);
			localStream.on('close', function() {
				callback(null, localFile);
			});
		} else
			callback(new Error("No file found at given url."), null);
	});
};

function proces_file_save() {

	console.log('Process file :' + name_file);
	var osmfile = osm_file;
	var count = {};

	var query_user = "SELECT iduser, osmuser, color, estado FROM osm_user";
	console.log(query_user)

	client.query(query_user, function(error, result) {
		if (error) {
			console.log(error);
			res.statusCode = 404;
			return res.send('Error 404: No quote found');
		} else {
			try {
				for (var i = 0; i < result.rows.length; i++) {
					user = new obj();
					count[result.rows[i].iduser] = user;
				}

				//Procesamiento de datos
				var file = new osmium.File(osmfile);
				var reader = new osmium.Reader(file);
				var handler = new osmium.Handler();

				//WAY
				handler.on('way', function(way) {
					//console.log(typeof way.timestamp);
					osmdate = way.timestamp;

					if (count.hasOwnProperty(way.uid) && _.size(way.tags()) > 0) { //evalua las Usuarios	
						if (way.version === 1) {
							++count[way.uid].osm_way.v1;
						} else {
							++count[way.uid].osm_way.vx;
						}
						//count[way.uid].osm_date.osmdate = way.timestamp;
						//count[way.uid].osm_date.osmfile = name_directory + '-' + name_file;
					}
				});
				//NODE
				handler.on('node', function(node) {

					if (count.hasOwnProperty(node.uid) && _.size(node.tags()) > 0) { //evalua las Usuarios	
						if (node.version === 1) {
							++count[node.uid].osm_node.v1;
						} else {
							++count[node.uid].osm_node.vx;
						}
					}
				});

				//RELATION
				handler.on('relation', function(relation) {
					if (count.hasOwnProperty(relation.uid) && _.size(relation.tags()) > 0) { //evalua las Usuarios	
						if (relation.version === 1) {
							++count[relation.uid].osm_node.v1;
						} else {
							++count[relation.uid].osm_node.vx;
						}
					}
				});
				reader.apply(handler);



				var query_data = 'INSERT INTO osm_date(idfile, osmdate)  VALUES ($1, $2);';
				client.query(query_data, [name_directory + '-' + name_file, osmdate],
					function(err, result) {
						if (err) {
							console.log(err);
						} else {
							console.log('row inserted with id: ' + result);
						}

					});


				//insertobjs(idfile, iduser , node_v1 , node_vx , way_v1 , way_vx , relation_v1 , relation_vx)

				_.each(count, function(val, key) {
					var obj_data = [];
					obj_data.push(name_directory + '-' + name_file);
					//obj_data.push(val.osm_date.osmdate);
					obj_data.push(key);
					obj_data.push(val.osm_node.v1);
					obj_data.push(val.osm_node.vx);
					obj_data.push(val.osm_way.v1);
					obj_data.push(val.osm_way.vx);
					obj_data.push(val.osm_relation.v1);
					obj_data.push(val.osm_relation.vx);

					console.log(obj_data);


					var query_insert = 'SELECT insertobjs($1, $2, $3, $4, $5, $6, $7, $8)';
					client.query(query_insert, obj_data,
						function(err, result) {
							if (err) {
								console.log(err);
							} else {
								console.log('row inserted with id: ' + result);
							}

						});

				/*	if (count.indexOf(key) + 1 == _.size(count)) {

						console.log('client.end();')

					}*/

				});



				//console.log(count);

			} catch (e) {
				console.log("entering catch block");

			}
		}
	});



}


function get_url_file() {
	if (num_file < 10) {
		name_file = '00' + num_file;
		num_file++;
	} else if (num_file >= 10 && num_file < 100) {
		name_file = '0' + num_file;
		num_file++;
	} else if (num_file >= 100 && num_file < 1000) {
		name_file = '' + num_file;
		num_file++;
	} else {
		num_file = 0;
		num_directory++;
		name_directory = '0' + num_directory;
	}
	return url + '/' + name_directory + '/' + name_file + '.osc.gz';
}



//intitializar parameters
var url = 'http://planet.openstreetmap.org/replication/hour/000';
var name_file = '';
var num_file = 43;
var num_directory = 19;
var name_directory = ''
name_directory = '0' + num_directory;
//
var osmdate = 0;


//setInterval(function() {
var url_file = get_url_file();
osm_file = name_file + '.osc'
download_file(url_file, osm_file, proces_file_save);

//}, 60 * 60 * 1000);