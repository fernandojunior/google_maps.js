// Copyright (c) 2015 Fernando Felix do Nascimento Junior

var Container = Class.extend({
	
	objects: {},
	
	prototype: {
		
		constructor: function (configuration) {
			
			this.register = configuration.register;
			
			if (typeof this.register == 'undefined' || !this.register)
				return;
			
			if (this.register) // register as default
				this.class.register(this);
			else // register == id
				this.class.register(this.register, this);
			
		},
		
	},
	
	register: function (id, object) {
		
		if (arguments.length == 1)
			this.objects['default'] = arguments[0];
		else
			this.objects[id] = object;

	},
	
	get: function () {
		
		var id = 'default';
		
		if (arguments.length == 1 && arguments[0] != true) // true == default also
			id = arguments[0];
		
		return this.objects[id];
		
	},
	
});

var Singleton = Class.extend({
	
	object: undefined,
	
	get: function () {
   		
   		if (typeof this.object == 'undefined') {    			
   			this.object = this.create();
   		}
   		
   		return this.object;
   		
   	},
	
});


var Map = Container.simple_extend({
	
	constructor: function (configuration) {
		
		this.super('constructor', [configuration]);
		
		this.canvas = configuration.canvas;		
		
		if (typeof this.canvas == typeof '')
			this.canvas = document.getElementById(this.canvas);
		
		// setting default google maps options
		this.options = configuration;
		delete this.options['register'];
		delete this.options['canvas'];
		
		var center = this.options.center;
		this.options.center = new google.maps.LatLng(center[0], center[1]);
		
		// render
		this.resource = new google.maps.Map(this.canvas, this.options);
		
	},

});

var Geocoder = Singleton.simple_extend({
	
	constructor: function () {
		
		this.queries = {}; // geocoder query responses
		this.resource = new google.maps.Geocoder();
		
	},
	
	// simple client cache system
	geocode: function (config, callback) {
		
		var self = this;
		var response = this.queries[config.address];
		
		if (typeof response == 'undefined') {
			(function (obj, config, callback) { // prevent context error 
				obj.resource.geocode(config, function (geocode, status) {
					
					if (status == google.maps.GeocoderStatus.OK)
						obj.queries[geocode[0].formatted_address] = arguments;
					
					if (status == 'OVER_QUERY_LIMIT') {						
						setTimeout(function(){							
							self.geocode(config, callback);						
						}, 2000);
						return;						
					}
					
					obj.queries[config.address] = arguments;
					
					obj.geocode(config, callback);
				});
			})(this, config, callback);
		} else {
			callback(response[0], response[1]);
		}

	}

});

var InfoWindow = Class.simple_extend({	
	constructor: function (configuration) {
		this.resource = new google.maps.InfoWindow(configuration);
		
		if (typeof configuration.marker != 'undefined')
			this.resource.open(configuration.marker.resource.map, configuration.marker.resource);
	},
	
	on: function (e, fn) {
		
		var self = this;
		
		if (typeof arguments[0] == typeof []) {
			
			var events = arguments[0];
			
			for (var key in events)			
				google.maps.event.addListener(self.resource, key, function () {
					events[key](self.resource);
				});
			
		} else {
			google.maps.event.addListener(self.resource, e, fn);				
		}
		
	},
});

var Marker = Class.extend({
	
	prototype: {
		
		constructor: function (configuration) {
			
			var map = configuration.map;
			if (typeof map == 'undefined')
				map = Map.get().resource;
			else if (typeof map == typeof '')
				map = Map.get(map).resource;
			else
				map = map.resource;
			
			configuration.map = map;
			
			this.address = configuration.address;
			this.content = configuration.content;
			this.events = configuration.events;
			var draw = configuration.draw; // draw the marker at constructor?
			
			
			// setting google maps default options (title, map, etc.)
			this.options = configuration;
			delete this.options['address']; // unnecessary
			delete this.options['content']; // unnecessary
			delete this.options['draw']; // unnecessary
			
			this.drawing = false; // is marker drawing?
			this.drawed = false; // was marker drawed?
			this.error = false; // has status query error
			
			if (typeof draw == 'undefined' || draw)
				this.draw();

		},
		
		draw: function () {
			
			if (this.drawing)
				return;
			
			if (!this.drawed)
				this.render();
			else
				this.resource.setMap(this.options.map);
			
		},
		
		undraw: function () {
			
			 if (typeof this.resource != 'undefined')
				this.resource.setMap(undefined);
			 
		},
		
		on: function (e, fn) {
			
			var self = this;
			
			if (typeof arguments[0] == typeof []) {
				
				var events = arguments[0];
				
				for (var key in events)					
					google.maps.event.addListener(self.resource, key, function () {
						events[key](self.resource);
					});
				
			} else {
				google.maps.event.addListener(self.resource, e, fn);				
			}
			
		},
		
		render: function () {
			
			var self = this;
			
			self.drawing = true;
				
			var geocoder = Geocoder.get();
			
			// getting address location
			geocoder.geocode( { 'address': self.address}, function(data, status) {
				
				if (status != google.maps.GeocoderStatus.OK) {
					console.log("Geocode was not successful for the following reason: " + status + '. Query ' + self.address);
					self.error = true;
					// return;
				}
				
				// creating marker
				var location = data[0].geometry.location;
				self.options['position'] = location;
				self.resource = new google.maps.Marker(self.options);
				
				self.resource.test = self;
				
				self.resource.geocode = data;
				
				if (typeof self.events != 'undefined')
					self.on(self.events);
				
				self.drawing = false;
				self.drawed = true;

			});
		
		},
		
	},
	
});

var Markers = Class.simple_extend({
	
	constructor: function () {
		this.markers = [];
	},
	
	all: function () {
		return this.all();
	},
	
	push: function (marker) {
		this.markers.push(marker);				
	},

	draw: function () {
		
		var self = this;
		
		var timeout = 0; 
			
		for (var i in this.markers)
			this.markers[i].draw();
		
	},
	
	undraw: function () {
		
		for (var i in this.markers)
			this.markers[i].undraw();
		
	},
	
	isDrawed: function () {
		
		var markers = this.markers;
		
		for (var i in markers)			
			if (!markers[i].drawed && markers[i].error == false)
				return false;

		return true;
		
	}
	
});
