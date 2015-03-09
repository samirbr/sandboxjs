function dummy() {
  return (new Date()).getTime();
}

function error(jqxhr, settings, exception) {

}

// namespace
var SANDBOX = (function ($) {
		// TODO: DWR, App, utils (jsDI, resources, autoloader, upload)
		
		$(document).ajaxError(function () {
			console.log(arguments[3].stack);
		});
		
		function normaliseLanguageCode(lang) {
			lang = lang.toLowerCase().replace('-', '_');
			if (lang.length > 3) {
				lang = lang.substring(0, 3) + lang.substring(3).toUpperCase();
			}
			return lang;
		}
		
		function trans(key) {
			if (translations.hasOwnProperty(key)) {
				return translations[key];
			} else {
				return false;
			}
		}
		
		var that;
    var options = {
      header    : true,
      path      : '',
      template  : [
        '<div id="container">',
          '<header>',
            '<div class="navbar">',
              '<div class="navbar-inner">',
                '<div class="container">',
                  '<a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">',
                    '<span class="icon-bar"></span>',
                    '<span class="icon-bar"></span>',
                    '<span class="icon-bar"></span>',
                  '</a>',
                  '<a class="brand" href="/">{%0%}</a>',
                  '<div class="nav-collapse">',
                    '<ul class="nav">{%1%}</ul>',
                  '</div>',
                '</div>',
              '</div>',
            '</div>',
          '</header>',        
        '<div>'
        ].join('\n')
    };
		
		var loaded = false;
		var translations = { };		
		
		var Site = function (title, culture, settings) {
      options = $.extend(options, settings);
    
			this.title = title;
			this.path = options.path;
			this.current = null;
			this.menu = [];
			this.routing = {};
			this.params = {};
			this.culture = normaliseLanguageCode(culture || navigator.language /* Mozilla */ || navigator.userLanguage /* IE */);
      this.template = options.template;
      
			document.title = title;
			
			that = this;
		};
		
		Site.prototype = {
			load: function (url, onComplete) {
				onComplete = onComplete || function () { };
			
				$.getJSON(url + '?' + dummy(), function (json) {
					that.putAll(json);
					that.render();
					onComplete($('#container').get(0), this.params);
				}).fail(error);
			},
			putAll: function (pages) {
				pages.forEach(function (page) {
					if (page.constructor !== SANDBOX.Page) {
						page = new SANDBOX.Page(page);
					}
					
					that.put(page);
				});
			},
			put: function (page) {
				this.menu.push(page);
				this.routing[page.route] = page;
				
				if (page.hasOwnProperty('pages')) {
					for (var i in page.pages) {
						var pg = page.pages[i];
						this.routing[pg.route] = pg;
					}
				}
			},
			forward: function (url) {
				if (typeof url == 'number' ) {
					var err = {
						403: 'Forbidden',
						404: 'Not Found'
					};
				
					var sb = [];
					sb.push('<div id="container">');
					sb.push('<br /><br /><br />');
					sb.push('<h1>' + url + ' ' + err[url] + '</h1>');
					sb.push('<img src="assets/img/' + url +  '.jpg" />');
					sb.push('<div>');
					
					document.title = this.title + ' :: ' + url + ' ' + err[url];
					
					$(document.body).html(sb.join('\n'));
					
					$('#container').css({
						'text-align': 'center',
						'width': '100%'
					});
					
					$('#container *').css('margin', '0 auto');
				} else {
					window.location = url;
				}
			},
			route: function () {
				var route = window.location.pathname.replace(new RegExp(SANDBOX.escape(this.path)), '');
				
				if (this.routing.hasOwnProperty(route)) {
					this.current = this.routing[route];
				} else {
					Object.keys(this.routing).forEach(function (key) {
						var params, matches;
						
						if (params = key.match(/\{([^\{\}\/]+)\}/gi)) {
							
							if (matches = route.match(new RegExp(key.replace(/\{([^\{\}\/]+)\}/gi, '([^\\/]+)'), 'i'))) {
								matches.shift();
								
								if (matches.length) {
									that.current = that.routing[key];
									that.params = SANDBOX.combine(params, matches);
									return false;
								}
							}
						}
					});
				}
				
				return this.current;
			},
			
			trans: function () {
				if (!loaded) {
					$.getJSON('/i18n/' + this.culture + '.json' + '?' + dummy(), function (json) {
						loaded = true;
						translations = json.translations;
					
						$('[data-trans]').each(function () {
							var key = $(this).attr('data-trans');
							var translation;
							if (translation = trans(key)) {
								$(this).text(translation);
							}
						});
					}).fail(error);
				}
			},
			
			render: function () {
				if (this.route()) {
					var sb = [];
					
          for (var i in this.menu) {
            if (this.menu[i].hasOwnProperty('pages')) {
              sb.push('<li class="dropdown">');
                sb.push('<a href="#" class="dropdown-toggle" data-toggle="dropdown">');	
                  sb.push(this.menu[i].name + ' <b class="caret"></b>');
                sb.push('</a>');
                sb.push('<ul class="dropdown-menu">');
                
                for (var j in this.menu[i].pages) {
                  var pg = this.menu[i].pages[j];
                  
                  sb.push('<li><a href="' + this.path + pg.route + '">' + pg.name + '</a></li>');
                }
              
                sb.push('</ul>');
              sb.push('</li>');
            } else {
              sb.push('<li><a href="' + this.path + this.menu[i].route + '">' + this.menu[i].name + '</a></li>');
            }
          }
					
					$(document.body).append(SANDBOX.format(this.template, this.title, sb.join('\n')));
          
          if (! options.header) {
            $(document.body).children('header').hide();
          }
					
					// $('#container').height($(window).height() - $('header').height() - 50);
					
					$('a[href="' + this.current.route + '"]').parent('li').addClass('active');
					
					document.title = this.title + ' :: ' + this.current.name;
					
          if (typeof this.current.content === 'object') {
						if (this.current.content.hasOwnProperty('src')) {
							var url = SANDBOX.replace(this.current.content.src, this.params);
							$('#container').load(url, function(response, status, xhr) {
							  if (status == 'error') {
                  that.forward(403);
							  }
							});
						} else if (this.current.content.hasOwnProperty('onReady')) {
							var fn = eval("dummy = " + this.current.content.onReady);
							if (typeof fn === 'function') {
								fn($('#container').get(0), this.params);
							}
						}
					} else {
						$('#container').append(SANDBOX.replace(this.current.content, this.params));
					}
				} else {
					this.forward(404); 
				}
				
				this.trans();
			}
		};
		
		return Site;
		
	})(jQuery);

	SANDBOX.Page = (function () {
		var Page = function (obj) {
			this.name = '';
			this.route = '/';
			this.content = '';
			
			for (var param in obj) {
				this[param] = obj[param];
			}
		};
		
		return Page;
	})();
  
  SANDBOX.format = function () {
    var params = Array.prototype.slice.call(arguments);
    var str = params.shift();
    
    params.forEach(function (arg, index) {
      str = str.split('{%' + index + '%}').join(arg);
    });
    
    return str;
  };

	SANDBOX.combine = function (keys, values) {
		var obj = { };
		
		for (var i = 0; i < keys.length; i++)
			 obj[keys[i]] = values[i];
		return obj;
	};
	
	SANDBOX.escape = function (regexp) {
		return regexp.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
	};
	
	SANDBOX.replace = function (str, obj) {
		if (Object.keys(obj).length) {
			for (var key in obj) {
				str = str.replace(new RegExp(SANDBOX.escape(key), 'g'), (decodeURIComponent(obj[key])).replace(/(\+)/, ' '));
			}
		}
		
		return str;
	};	

	// namespace
	SANDBOX.DWR = { };
	SANDBOX.DWR.url = '/dwr';
	SANDBOX.DWR.ajax = function (entity, method, params) {
		return $.parseJSON($.ajax({
			url: SANDBOX.DWR.URL,
			type: 'post',
			dataType: 'json',
			data: {
				entity: entity,
				method: method,
				params: params
			},
			async: false
		}).responseText);
	};