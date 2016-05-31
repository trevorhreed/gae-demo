var app = angular.module('app', ['ui.router', 'ngAria', 'ngAnimate', 'ngMaterial']);

app.controller('main', function($scope, $http, $window){

  $scope.authenticate = function(){
    $scope.error = "";
    $http.post('/api/auth/login', $scope.user, {
      headers: {'Content-Type': 'application/json'}
    })
    .then(function(){
      $window.location.href = '/#/';
    }).catch(function(){
      $scope.error = "Invalid username or password.";
    })
  }
})
