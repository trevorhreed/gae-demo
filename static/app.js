var app = angular.module('app', ['ui.router', 'ngAria', 'ngAnimate', 'ngMaterial']);

var routes = [];
function route(states, component){
  if(!Array.isArray(states)) states = [states];
  for(var i=0; i < states.length; i++){
    if(component){
      states[i].css = component.css;
      states[i].scopedCss = component.scopedCss;
      states[i].template = component.template;
      states[i].templateUrl = component.templateUrl;
      states[i].controller = component.controller;
    }
    routes.push(states[i]);
  }
}
function css(strings){ return strings.raw[0]; }
function html(strings){ return strings.raw[0]; }

function addScss(scss, name){
  Sass.compile(scss, function(css){
    if(css.status !== 0) throw css.message;
    $('head').append(`<style type="text/css" ${name}>${css.text}</style>`);
  })
}

app.provider('NavLinks', function(){
  var _navLinks = [];
  return {
    addLink: function(link){
      _navLinks.push(link);
    },
    $get: function(){
      return _navLinks;
    }
  }
})

app.config(function($stateProvider, $urlRouterProvider, NavLinksProvider){
  for(var i=0; i < routes.length; i++){
    $stateProvider.state(routes[i].name, routes[i]);
    if(routes[i].index) $urlRouterProvider.otherwise(routes[i].index);
    if(routes[i].nav){
      routes[i].nav.sref = routes[i].name;
      NavLinksProvider.addLink(routes[i].nav);
    }
    (function(route){
      if(route.css){
        addScss(route.css, route.name);
      }
      if(route.scopedCss){
        var scss = `[css-scope="${route.name}"]{${route.scopedCss}}`;
        addScss(scss, route.name);
      }
    })(routes[i]);
  }
});

app.config(function($mdThemingProvider){
  $mdThemingProvider
    .theme('default')
    .primaryPalette('green')
    .accentPalette('blue');
});

app.config(function(apiProvider){
  apiProvider.setBaseUrl('/api');
})

app.provider('api', function(){
  var BASE_URL = '',
      transactionPromises;
  return {
    setBaseUrl: function(baseUrl){
      BASE_URL = baseUrl;
    },
    $get: function($http, $q){
      function api(endpoint, data){
        var config = {},
            parts = endpoint.split(' ');
        if(parts.length !== 2) throw 'API Endpoint must be in the form "[METHOD] [URL]".';
        config.method = parts[0];
        config.url = BASE_URL + parts[1];
        config.header = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        if(data !== void 0){
          config.data = data;
        }
        var promise = $http(config).then(function(res){
          return res.data;
        }).catch(function(res){
          var message = 'ERROR (API): ' + res.status + ' ' + res.statusText;
          alert(message);
          return $q.reject(message)
        })

        if(transactionPromises !== void 0){
          transactionPromises.push(promise);
        }

        return promise;
      }

      api.begin = function(){
        transactionPromises = [];
      };

      api.end = function(){
        var promise = $q.all(transactionPromises);
        transactionPromises = void 0;
        return promise;
      }

      return api;
    }
  }
})

app.service('paletteApi', function(api){
  function all(){
    return api('GET /palettes');
  }
  function get(id){
    return api('GET /palettes/' + id);
  }
  function put(entity){
    if(entity.id){
      return api('PUT /palettes/' + entity.id, entity);
    }else{
      return api('POST /palettes', entity);
    }
  }
  function del(id){
    return api('DELETE /palettes/' + id);
  }

  return {
    all: all,
    get: get,
    put: put,
    del: del
  }
})

app.run(function($rootScope, $state){
  $rootScope.$on('$viewContentLoaded', function(event){
    $('.layout-content').attr('css-scope', $state.current.name);
  })
})

app.directive('loadingSignal', function () {
  addScss(css`
    loading-signal{
      position:absolute;
      top:0;right:0;bottom:0;left:0;
      background:rgba(255, 255, 255, .9);
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:not-allowed;
      z-index:2;
    }
  `);
	return {
		restrict: 'E',
		scope: {
			active: '=',
			progress: '='
		},
		template: '<md-progress-circular class="md-primary" md-mode="{{mode}}" value="{{progress}}" md-diameter="50"></md-progress-circular>',
		link: function (scope, element, attrs) {
			var parentOverflowValue = element.parent().css('overflow');
			scope.mode = 'indeterminate';
			scope.$watch('progress', function (progress) {
				scope.mode = !isNaN(progress) ? 'determinate' : 'indeterminate';
			})
			scope.$watch('active', function (active) {
				element.css('display', scope.active ? 'flex' : 'none');
				element.parent().css('overflow', scope.active ? 'hidden' : parentOverflowValue);
			});
		}
	}
})

app.directive('copyable', function($timeout) {
  addScss(`[copyable]{cursor:pointer;}`, 'copyable');
  function doSelection(element) {
    if (document.selection) {
      var range = document.body.createTextRange();
      range.moveToElementText(element.get());
      range.select();
    } else if (window.getSelection) {
      var range = document.createRange();
      range.selectNode(element.get(0));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  }
  return {
    restrict: 'A',
    link: function(scope, element) {
      var timer = null;
      element.mousedown(function(event) {
        if (event.which == 3) {
          doSelection(element);
        }else if(event.which == 1){
          doSelection(element);
          document.execCommand('copy');
        }
      });
    }
  }
})

app.directive('searchBox', function($timeout) {
  var KEY_FORWARD_SLASH = 191,
    KEY_ESCAPE = 27;

  function debounce(fn, duration) {
    var timeout;
    return function() {
      $timeout.cancel(timeout);
      timeout = $timeout(fn, duration);
    }
  }
  addScss(css`
    search-box{
      .search-box{
        display:flex;
        align-items:center;
        position:absolute;
        top:5px;left:5px;bottom:5px;right:5px;
        background-color:#fff;
        z-index:10;
        transition: opacity 6s ease;
        &.ng-hide{
          opacity:0;
        }
        &.ng-hide-add{
          transition: opacity linear 100ms;
        }
        &.ng-hide-remove{
          transition: opacity linear 100ms;
        }
        input{
          outline:none;
          border:none;
        }
        .md-button:not(.md-primary) md-icon{color:#aaa}
      }
    }
  `, 'search-box');
  return {
    scope: {
      ngOuterModel: '=?ngModel',
      mdeOnChange: '&'
    },
    template: html`
      <div class="search-box" ng-show="active" layout="row">
        <md-button class="md-icon-button md-primary" ng-click="close()" aria-label="Close search">
            <md-icon md-font-icon="mdi-arrow-left"></md-icon>
        </md-button>
        <input flex ng-model="ngOuterModel" ng-keyup="change($event)" placeholder="{{placeholder}}" />
        <md-button class="md-icon-button" ng-click="clear()" aria-label="Clear search">
            <md-icon md-font-icon="mdi-close"></md-icon>
        </md-button>
      </div>
      <md-button class="md-icon-button" ng-click="focus()" aria-label="Open search">
          <md-icon md-font-icon="mdi-magnify"></md-icon>
      </md-button>
    `,
    link: function(scope, element, attrs) {
      var $inputEl = $('input', element);
      scope.active = false;
      scope.placeholder = attrs.placeholder || 'Search';
      scope.ngOuterModel = scope.ngOuterModel || '';

      function triggerChange(type) {
        if(scope.mdeOnChange){
          scope.mdeOnChange({ '$event': type });
        }
      }
      var triggerChangeDebounced = debounce(function() {
        triggerChange('keyup');
      }, 500);

      $(document).on('keyup', function(event) {
        $timeout(function() {
          if (event.which === KEY_ESCAPE && $('.search-box', element).find(':focus').length > 0) {
            scope.close();
          } else if (event.which === KEY_FORWARD_SLASH) {
            var tag =
              event &&
              event.target &&
              event.target.tagName &&
              event.target.tagName.toUpperCase &&
              event.target.tagName.toUpperCase();
            //tag = tag || void 0; // don't think this is necessary --tr
            if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
              scope.focus();
            }
          }
        })
      });

      function setFocusOnInput() {
        if ($inputEl.is(':visible')) {
          $inputEl.focus();
        } else {
          $timeout(setFocusOnInput);
        }
      }

      scope.focus = function() {
        scope.active = true;
        setFocusOnInput();
      }

      scope.close = function() {
        scope.active = false;
        triggerChange('close');
      }

      scope.change = function($event) {
        if ($event.which !== KEY_ESCAPE) {
          triggerChangeDebounced();
        }
      }

      scope.clear = function() {
        $('input', element).val('');
        triggerChange('clear');
        scope.focus();
      }
    }
  }
})

app.directive('lightboxTrigger', function($compile){
  return {
    scope: {
      lightboxTrigger: '='
    },
    link: function(scope, element, attrs){
      element.on('click', function(){
        var lightboxScope = scope.$new(true, null);
        lightboxScope.palette = scope.lightboxTrigger;
        var lightbox = $compile('<lightbox palette="palette"></lightbox>')(lightboxScope);
        $(lightbox).hide().appendTo('body').fadeIn();
      })
    }
  }
})
app.directive('lightbox', function(){
  var lightboxCss = css`
    lightbox{
      z-index:100;
      position:fixed;
      top:0;
      left:0;
      bottom:0;
      right:0;
      background:rgba(0, 0, 0, .8);
      padding:1em;
    }
    lightbox > md-content{
      box-sizing:border-box;
      height:100%;
    }
    lightbox color-swatch{
      height:100% !important;
      width:auto;
    }
  `;
  $('head').append(`<style>${lightboxCss}</style>`);
  return {
    restrict: 'E',
    scope: {
      palette: '='
    },
    template: html`
      <md-content layout-gt-sm="row" layout="column" class="lightbox-container md-whiteframe-2dp">
        <color-swatch ng-repeat="color in palette.colors" color="color" flex copyable></color-swatch>
      </md-content>
    `,
    link: function(scope, element, attrs){
      function close(){
        element.fadeOut(function(){
          element.remove();
        });
      }
      element.on('click', function(){
        close();
      });
      $(document).on('keyup', function(e){
        if(e.which == 27) close();
      })
    }
  }
})

app.directive('colorSwatch', function(){
  $('head').append(`<style>
    color-swatch{
      display:inline-block;
      -border-radius:50%;
      width:2em;
      height:2em;
      vertical-align:bottom;
      box-sizing:border-box;
      display:flex;
      justify-content: center;
      align-items: center;
    }
  </style>`);
  function getTextColor(hex){
    if(hex && hex.length && hex[0] === '#'){
      hex = hex.substr(1);
    }
    if(hex.length === 3){
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.substr(0,2),16);
    var g = parseInt(hex.substr(2,2),16);
    var b = parseInt(hex.substr(4,2),16);
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 140) ? 'rgba(0, 0, 0, .8)' : 'rgba(255, 255, 255, .8)';
  }
  return {
    restrict: 'E',
    scope: {
      color: '='
    },
    link: function(scope, element, attrs){
      scope.$watch('color', function(){
        element.css('background-color', scope.color);
        element.css('color', getTextColor(scope.color));
      })
    }
  }
})

app.directive('palettePicker', function($mdDialog, $timeout){
  $('head').append(`<style>
    palette-picker{
      display:block;
      margin-bottom:2em;
    }
    palette-picker div{
      max-width:22em;
    }
    palette-picker color-swatch{
      margin:1em;
      box-shadow:0 0 1em #aaa;
      width:2.5em;
      height:2.5em;
    }
  </style>`);
  return {
    restrict: 'E',
    scope: {
      colors: '=',
      max: '='
    },
    template: html`
      <loading-signal active="loading"></loading-signal>
      <div ng-repeat="color in colors track by $index" layout="row" layout-align="center center">
        <color-swatch color="color"></color-swatch>
        <md-input-container flex>
          <label>Color</label>
          <input ng-model="colors[$index]" />
        </md-input-container>
        <md-button class="md-icon-button md-warn" aria-label="Remove Color" ng-click="remove($index)">
          <md-icon md-font-icon="mdi-delete"></md-icon>
        </md-button>
      </div>
      <div ng-if="colors.length < max">
        <md-button aria-label="Add Color" ng-click="add()">
          Add Color
        </md-button>
        <md-button aria-label="Generate From Image" ng-click="generate()">
          Generate From Image...
        </md-button>
      </div>
    `,
    link: function(scope, element, attrs){
      scope.colors = scope.colors || [];

      scope.add = function(){
        scope.colors.push('#000000');
      }

      scope.remove = function($index){
        scope.colors.splice($index, 1);
      }

      scope.generate = function(){
        scope.loading = true;
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.addEventListener('change', function(e){
          var reader = new FileReader();
          reader.onload = function(e){
            var img = document.createElement('img');
            img.src = e.target.result;
            var vibrant = new Vibrant(img, 256);
            var swatches = vibrant.swatches();
            $timeout(function(){
              scope.colors = [];
              for(var swatch in swatches){
                if(swatches.hasOwnProperty(swatch) && swatches[swatch]){
                  scope.colors.push(swatches[swatch].getHex());
                }
              }
              scope.loading = false;
            })
          }
          reader.readAsDataURL(fileInput.files[0]);
        })
        fileInput.click();
      }

    }
  }
})

route({
  abstract: true,
  name: 'site',
  url: '/'
},{
  css: css`
    md-sidenav{
      a.md-button{
        width:100%;
        margin:0;
        padding:6px;
        text-align:left;
        text-transform:none;
        &.active{
          background: #dedede !important;
        }
      }
    }
    .layout-wrapper{
      background:#eee;
      overflow:auto;
    }
    .layout-content{
      width:40em;
      max-width:100%;
      margin:0 auto;
      background:#eee;
      overflow:visible;
    }
    .layout-content > md-content {
      margin:1em;
      padding: 1rem 1.3rem;
      box-sizing: border-box;
    }
  `,
  template: html`
    <md-content layout="column" flex>
      <md-toolbar class="md-toolbar-tools md-whiteframe-1dp">
        <h2 ui-sref="site.listing">Palettes</h2>
        <span flex></span>
        <search-box ng-model="search"></search-box>
        <md-menu md-offset="0 65">
          <md-button class="md-icon-button"
                      md-menu-origin
                      aria-label="Open user menu"
                      ng-click="$mdOpenMenu($event)">
            <md-icon md-font-icon="mdi-account-circle"></md-icon>
          </md-button>
          <md-menu-content>
            <md-menu-item>
              <span>{{nickname}}</span>
            </md-menu-item>
            <md-menu-item>
              <md-button ng-click="logout()">
                <md-icon md-font-icon="mdi-logout"></md-icon>
                Logout
              </md-button>
            </md-menu-item>
          </md-menu-content>
        </md-menu>
      </md-toolbar>
      <md-content layout="column" flex class="layout-wrapper">
        <md-content class="layout-content" ui-view></md-content>
      </md-content>
    </md-content>
  `,
  controller: function($scope, NavLinks, api, $window){
    var settingsPromise = api('GET /settings').then(function(settings){
      $scope.nickname = settings.nickname;
      return settings;
    })
    $scope.links = NavLinks;

    $scope.logout = function(){
      settingsPromise.then(function(settings){
        $window.location = settings.logoutUrl;
      })
    }

    $scope.test = 'Hello Word! This is the layout!';
  }
})

route({
  name: 'site.listing',
  url: '',
  index: '/'
},{
  scopedCss: css`
    .palette{
      margin:1em 0;
    }
    color-swatch{
      height:4em;
      width:auto;
    }
  `,
  template: html`
    <md-content class="md-whiteframe-2dp" ng-repeat="palette in palettes | filter: search | orderBy:'title'">
      <md-content layout="row" layout-align="center center">
        <h2 class="md-headline" flex ui-sref="site.edit({id: palette.id})">{{palette.title}}</h2>
        <md-button class="md-icon-button"
                    aria-label="Expand"
                    lightbox-trigger="palette">
          <md-icon md-font-icon="mdi-arrow-expand"></md-icon>
        </md-button>
      </md-content>
      <md-content layout-gt-sm="row" layout="column" class="palette md-whiteframe-2dp">
        <color-swatch ng-repeat="color in palette.colors" color="color" flex copyable>
          {{color}}
        </color-swatch>
      </md-content>
    </md-content>
    <md-button class="md-fab" aria-label="New" ui-sref="site.new">
      <md-icon md-font-icon="mdi-plus"></md-icon>
    </md-button>
    <lightbox-placeholder></lightbox-placeholder>
  `,
  controller: function($scope, api){
    api('GET /palettes').then(function(palettes){
      $scope.palettes = palettes;
    })

    $scope.expand = function(palette){
      var html = '<lightbox palette="selectedPalette"></lightbox>';
      $scope.selectedPalette = palette;
      $(html).hide().appendTo('lightbox-placeholder').fadeIn();
    }
  }
})

route([
  {
    name: 'site.new',
    url: 'new'
  },
  {
    name: 'site.edit',
    url: 'edit/:id'
  }
],{
  scopedCss: css``,
  template: html`
    <md-content class="md-whiteframe-5dp">
      <md-input-container class="md-block">
        <label>Name</label>
        <input ng-model="palette.title" />
      </md-input-container>
      <palette-picker colors="palette.colors" max="12"></palette-picker>
      <div right>
        <md-button class="md-raised md-accent"
                    aria-label="Save"
                    ng-click="save()">Save</md-button>
        <md-button class="md-raised md-warn"
                    ng-if="paletteId"
                    aria-label="Delete"
                    ng-click="delete()">Delete</md-button>
        <md-button class="md-raised"
                    aria-label="Cancel"
                    ng-click="cancel()">Cancel</md-button>
      </div>
    </md-content>
  `,
  controller: function($scope, $mdToast, $mdDialog, $state, $stateParams, paletteApi){
    $scope.paletteId = $stateParams.id;

    if($scope.paletteId){
      paletteApi.get($scope.paletteId).then(function(palette){
        $scope.palette = palette;
      })
    }

    $scope.save = function(){
      if(!$scope.palette.title){
        $mdToast.show(
          $mdToast.simple()
            .textContent('Please enter a title')
            .action('Dismiss')
        )
        return;
      }
      paletteApi.put($scope.palette).then(function(){
        $state.go('site.listing');
      });
    }

    $scope.delete = function(){
      var confirm = $mdDialog
        .confirm()
        .textContent('Are you sure you want to delete this palette?')
        .ok('Delete')
        .cancel('Cancel');

      $mdDialog.show(confirm).then(function(){
        paletteApi.del($scope.paletteId).then(function(){
          $state.go('site.listing');
        });
      });
    }

    $scope.cancel = function(){
      $state.go('site.listing');
    }
  }
})

angular.bootstrap(document, ['app']);
