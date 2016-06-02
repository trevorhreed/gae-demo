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
        Sass.compile(route.css, function(css){
          $('head').append(`<style type="text/css" ${route.name}>${css.text}</style>`);
        });
      }
      if(route.scopedCss){
        var scss = `[css-scope="${route.name}"]{${route.scopedCss}}`;
        Sass.compile(scss, function(css){
          $('head').append(`<style type="text/css" ${route.name}>${css.text}</style>`);
        });
      }
    })(routes[i]);
  }
});

app.config(function($mdThemingProvider){
  /*
  $mdThemingProvider
    .theme('default')
    .primaryPalette('grey')
    .accentPalette('grey');
    */
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

app.directive('copyable', function($timeout) {
  $('head').append('<style>[copyable]{cursor:pointer;}</style>');
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

app.directive('colorSwatch', function(){
  $('head').append(`<style>
    color-swatch{
      display:inline-block;
      -border-radius:50%;
      width:2em;
      height:2em;
      vertical-align:bottom;
      box-sizing:border-box;
      text-align:center;
      line-height:2em;
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

app.directive('palettePicker', function(){
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
      -box-shadow:0 0 1em #aaa;
    }
    color-swatch{
      line-height:4em;
      height:4em;
      width:auto;
    }
  `,
  template: html`
    <md-content class="md-whiteframe-2dp" ng-repeat="palette in palettes">
      <h2 class="md-headline" flex ui-sref="site.edit({id: palette.id})">{{palette.title}}</h2>
      <md-content layout-gt-sm="row" layout="column" class="palette md-whiteframe-2dp">
        <color-swatch ng-repeat="color in palette.colors" color="color" flex copyable>
          {{color}}
        </color-swatch>
      </md-content>
    </md-content>
    <md-button class="md-fab" aria-label="New" ui-sref="site.new">
      <md-icon md-font-icon="mdi-plus"></md-icon>
    </md-button>
  `,
  controller: function($scope, api){
    api('GET /palettes').then(function(palettes){
      $scope.palettes = palettes;
    })

    $scope.getTextColor = function(hex){
      if(hex.length === 3){
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      var r = parseInt(hex.substr(0,2),16);
      var g = parseInt(hex.substr(2,2),16);
      var b = parseInt(hex.substr(4,2),16);
      var yiq = ((r*299)+(g*587)+(b*114))/1000;

      var color = (yiq >= 140) ? 'black' : 'white';

      console.log(hex + ' | ' + color);
      return color;
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
  scopedCss: css`

  `,
  template: html`
    <md-content class="md-whiteframe-5dp">
      <md-input-container class="md-block">
        <label>Name</label>
        <input ng-model="palette.title" />
      </md-input-container>
      <palette-picker colors="palette.colors" max="8"></palette-picker>
      <div right>
        <md-button class="md-raised md-accent" aria-label="Save" ng-click="save()">
          Save
        </md-button>
        <md-button class="md-raised md-danger"
                    ng-if="paletteId"
                    aria-label="Delete"
                    ng-click="delete()">
          Delete
        </md-button>
        <md-button class="md-raised" aria-label="Cancel" ng-click="cancel()">
          Cancel
        </md-button>
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
