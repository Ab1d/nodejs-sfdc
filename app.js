
/**
 * Module dependencies.
 */

var express = require('express');
var sfdc = require('sfdc-node')

var app = module.exports = express.createServer();

//OAuth Configuration
var clientId = '3MVG9ZL0ppGP5UrDaNoSx8IYDY4SpzN.r7b0l_FISPXNbkR1HdH4WGMOUCWegT9GcUE.jV4x.2948Ru6oFHR6';
var clientSecret = '2805398087663395527';
var redirectUri = 'https://localhost:8080/auth/forcedotcom/callback';

//These are set after authorize is called
var token;
var instance;
var rtoken;

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));

	//pass the app and callback path to configure callback route for sfdc remote access authentication
	//as well as a method to call when the call back happens
	sfdc.configureCallback(app, '/auth/forcedotcom/callback',redirectUri, function(access_token, refresh_token, results, response){
		//use this call back method to perform any custom code after the authorziation process eg display a landing page

		//set the token, instnace, and code that is returned after the authorization calls to sfdc
		//console.log(results);
		token = access_token;
		instance = results.instance_url;
		rtoken = refresh_token;

		response.redirect('/create/lead');
	});
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


// Routes
app.get('/', function(req, res){
  res.render('index', {
    title: 'Salesforce Node.js'
  });
});

app.post('/', function(req, res){
	//Click a button to intialize authentication
	sfdc.authorize(clientId, clientSecret, 'https://login.salesforce.com', redirectUri, 'popup', function(result, statusCode, location){
		//if a 302 response is returned redirect
		//: Need to call back to authorize to process the 302.  OAuth library does not do this automatically
		if(statusCode == 302){
			res.redirect(location, 302);
		} else {
			res.end(result);
		}
	});
});

//Create
app.get('/create/:sobject', function(req, res) {
  res.render('create', {
    title: 'Create ' + req.params.sobject
  });
});

app.post('/create/:sobject', function(req, res) {
  sfdc.create(req.body, req.params.sobject, token, instance, function(results){
		if(results.id){
			res.end("<html><h2><a href='"+ instance +"/"+results.id +"' target='_blank'>" + req.params.sobject +
				" created</h2><br><a href='/update/lead/" + results.id +"'>Update Lead?</a><br/>" +
				"<a href='/delete/lead/"+ results.id +"'>Delete Lead?</a></html>");
		} else {
			var message = "<ul>";

			for(i=0; i<results.length; i++){
				//console.log(i);
				message = message + "<li>" + results[i].message + "</li>";
			}
			message = message + "</ul>";
			console.log(message);
			res.end("<html><h2>Error:</h2>"+ message + "</html>");
		}
	});
});

//update
app.get('/update/:sobject/:id', function(req, res) {
  res.render('Update', {
    title: 'Update ' + req.params.sobject,
		sobject: req.params.sobject,
		id: req.params.id
  });
});

app.post('/update/:sobject/:id', function(req,res){
	  sfdc.update(req.params.id, req.body, req.params.sobject, token, instance, function(results){
			if(results==null){
				res.end("<html><h2><a href='"+ instance +"/"+req.params.id +"' target='_blank'>" + req.params.sobject + " updated</h2><br></html>");
			} else {

				var message = "<ul>";

				for(i=0; i<results.length; i++){
					//console.log(i);
					message = message + "<li>" + results[i].message + "</li>";
				}
				message = message + "</ul>";
				console.log(message);
				res.end("<html><h2>Error:</h2>"+ message + "</html>");
			}
	});
});

//upsert
app.get('/upsert/:sobject/:extid', function(req, res) {
  res.render('Upsert', {
    title: 'Update ' + req.params.sobject,
		sobject: req.params.sobject,
		field: 'Web_Id__c',
		extid: req.params.extid
  });
});


app.post('/upsert/:sobject/:field/:extid', function(req,res){
	  sfdc.upsert(req.params.extid, req.params.field, req.body, req.params.sobject, token, instance, function(results){
			if(results==null){
				res.end("<html><h2><a href='"+ instance +"/"+req.params.id +"' target='_blank'>" + req.params.sobject + " upserted</h2><br></html>");
			} else {

				var message = "<ul>";

				for(i=0; i<results.length; i++){
					//console.log(i);
					message = message + "<li>" + results[i].message + "</li>";
				}
				message = message + "</ul>";
				console.log(message);
				res.end("<html><h2>Error:</h2>"+ message + "</html>");
			}
	});
});

//delete
app.get('/delete/:sobject/:id', function(req, res) {
  res.render('Delete', {
    title: 'Delete ' + req.params.sobject,
		id: req.params.id
  });
});

app.post('/delete/:sobject', function(req,res){
	  sfdc.delete(req.param('Id'), req.params.sobject, token, instance, function(results){
			if(results==null){
				res.end("<html><h2>" + req.param('Id') + " deleted</h2><br></html>");
			} else {

				var message = "<ul>";

				for(i=0; i<results.length; i++){
					//console.log(i);
					message = message + "<li>" + results[i].message + "</li>";
				}
				message = message + "</ul>";
				console.log(message);
				res.end("<html><h2>Error:</h2>"+ message + "</html>");
			}
	});
});

//query
app.get('/query', function(req, res){
	res.render('query', {
		title: 'Query'
	});
});

app.post('/query', function(req, res){
	var query = req.param('query');
	sfdc.query(query,token, instance,  function(results){
		var recs =renderGridData(results);

		res.render('queryresults', {
			title:'Results for Query: '+query,
			records: recs
			});
	});
});

var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Listening on " + port);
});


function buildHeaders(records){
  var headers = [];
  for(var i in records[0]){
  	headers.push(i);
  }
  return headers;
}

function renderGridData(results){

  var data = [];
  var sObjectAttributes = {};

  //Need to always build headers for row length/rendering
  var headers = buildHeaders(results.records);
	data.push(headers);

  for (var i in results.records) {
  	var values = [];
    for(var j in results.records[i]){
      values.push(results.records[i][j]);
		}
    data.push(values);
  }
  return data
}
