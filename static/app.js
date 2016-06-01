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
  $mdThemingProvider
    .theme('default')
    .primaryPalette('grey')
    .accentPalette('grey');
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

app.run(function($rootScope, $state){
  $rootScope.$on('$viewContentLoaded', function(event){
    $('.layout-content').attr('css-scope', $state.current.name);
  })
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
  `,
  template: html`
    <md-content layout="column" flex>
      <md-toolbar class="md-toolbar-tools">
        <h2>Palettes</h2>
        <span flex></span>
        <md-menu md-offset="0 80">
          <md-button class="md-icon-button" aria-label="Open user menu" ng-click="$mdOpenMenu($event)">
            <md-icon md-font-icon="mdi-account-circle"></md-icon>
          </md-button>
          <md-menu-content>
            <md-menu-item>
              <span hide-sm>{{nickname}}</span>
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
      <md-content flex ui-view class="layout-content"></md-content>
    </md-content>
  `,
  controller: function($scope, NavLinks, api, $window){
    var settingsPromise = api('GET /app/settings').then(function(settings){
      $scope.nickname = settings.nickname;
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
    h1{ color: red; }
  `,
  template: html`
    <md-content>
      <h1>Home!</h1>
    </md-content>
    <md-button class="md-fab" aria-label="New" ui-sref="site.new">
      <md-icon md-font-icon="mdi-plus"></md-icon>
    </md-button>
  `,
  controller: function($scope){

  }
})

app.directive('colorCircle', function(){
  $('head').append(`<style>
    color-circle{
      display:inline-block;
      border-radius:50%;
      width:1.6em;
      height:1.6em;
      vertical-align:bottom;
      box-sizing:border-box;
      border:solid 1px #ddd;
      margin:0 .5em;
    }
  </style>`);
  return {
    restrict: 'E',
    scope: {
      color: '='
    },
    link: function(scope, element, attrs){
      scope.$watch('color', function(){
        element.css('background-color', scope.color);
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
      width:18em;
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
        <color-circle color="color"></color-circle>
        <md-input-container flex>
          <label>Color</label>
          <input ng-model="colors[$index]" />
        </md-input-container>
        <md-button class="md-icon-button" aria-label="Remove Color" ng-click="remove($index)">
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
      scope.colors = scope.colors || ['#FF0088'];

      scope.add = function(){
        scope.colors.push('#000000');
      }

      scope.remove = function($index){
        scope.colors.splice($index, 1);
      }
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
    <md-content>
      <md-input-container class="md-block">
        <label>Name</label>
        <input ng-model="palette.name" />
      </md-input-container>
      <palette-picker colors="palette.colors" max="3"></palette-picker>
      <md-button class="md-raised md-accent" aria-label="Save" ng-click="save()">
        Save
      </md-button>
      <md-button class="md-raised" aria-label="Cancel">
        <span ui-sref="site.listing">Cancel</span>
      </md-button>
    </md-content>
  `,
  controller: function($scope, $stateParams){
    $scope.palette = {
      name: 'Gosha',
      colors: ['#FF8800', '#FF0088']
    }
  }
})



angular.bootstrap(document, ['app']);
