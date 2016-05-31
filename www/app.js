var app = angular.module('app', ['ui.router', 'ngAria', 'ngAnimate', 'ngMaterial']);

var routes = [];
function route(config){ routes.push(config); }

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
    if(routes[i].index) $urlRouterProvider.otherwise(routes[i].url);
    if(routes[i].nav){
      routes[i].nav.sref = routes[i].name;
      NavLinksProvider.addLink(routes[i].nav);
    }
    if(routes[i].css){
      $('head').append(`<style app-css>${routes[i].css}</style>`);
    }
  }
});

route({
  abstract: true,
  name: 'site',
  url: '/',
  css: `
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
  template: `
    <md-content layout="row" flex>
      <md-toolbar class="md-toolbar-tools">
        <h2>App</h2>
        <span flex></span>
        <md-button class="md-icon-button" aria-label="Log In">
          <md-icon md-font-icon="mdi-login"></md-icon>
        </md-button>
        <md-button class="md-icon-button" aria-label="Log Out">
          <md-icon md-font-icon="mdi-logout"></md-icon>
        </md-button>
      </md-toolbar>
      <md-content layout="column" flex ui-view class="layout-content"></md-content>
    </md-content>
  `,
  controller: function($scope, NavLinks){
    $scope.links = NavLinks;
    $scope.test = 'Hello Word! This is the layout!';
  }
})

route({
  name: 'site.home',
  url: '',
  index: true,
  template: `
    Hello!
  `,
  controller: function($scope){

  }
})
