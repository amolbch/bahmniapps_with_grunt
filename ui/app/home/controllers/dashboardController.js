'use strict';

angular.module('bahmni.home')
    .controller('DashboardController', ['$scope', '$state', 'appService', 'locationService', 'spinner', '$bahmniCookieStore', '$window', '$q', '$rootScope', 'providerService', 'providerTypeService',
        function ($scope, $state, appService, locationService, spinner, $bahmniCookieStore, $window, $q, $rootScope, providerService, providerTypeService) {
            $scope.appExtensions = appService.getAppDescriptor().getExtensions($state.current.data.extensionPointId, "link") || [];
            $scope.selectedLocationUuid = {};
            var allProviders;

            var initProvider = function () {
                $scope.noFormFoundMessage = "No Form found for this patient";
                $scope.isFormFound = false;
                return $q.all([providerTypeService.getAllProviders()]).then(function (results) {
                    allProviders = results[0];
                    var currentProvider = $rootScope.currentProvider;
                    providerService.getProviderAttributes(currentProvider.uuid).then(function (response) {
                        if (response.data) {
                            $rootScope.providerType = providerTypeService.getProviderType(response.data.results)[0];
                        }
                    });
                });
            };

            initProvider();

            var isOnline = function () {
                return $window.navigator.onLine;
            };

            $scope.isVisibleExtension = function (extension) {
                return extension.exclusiveOnlineModule ? isOnline() : extension.exclusiveOfflineModule ? !isOnline() : true;
            };

            var getCurrentLocation = function () {
                return $bahmniCookieStore.get(Bahmni.Common.Constants.locationCookieName) ? $bahmniCookieStore.get(Bahmni.Common.Constants.locationCookieName) : null;
            };

            var init = function () {
                return locationService.getAllByTag("Login Location").then(function (response) {
                    $scope.locations = response.data.results;
                    $scope.selectedLocationUuid = getCurrentLocation().uuid;
                }
                );
            };

            var getLocationFor = function (uuid) {
                return _.find($scope.locations, function (location) {
                    return location.uuid === uuid;
                });
            };

            $scope.isCurrentLocation = function (location) {
                return getCurrentLocation().uuid === location.uuid;
            };

            $scope.onLocationChange = function () {
                var selectedLocation = getLocationFor($scope.selectedLocationUuid);
                $bahmniCookieStore.remove(Bahmni.Common.Constants.locationCookieName);
                $bahmniCookieStore.put(Bahmni.Common.Constants.locationCookieName, {
                    name: selectedLocation.display,
                    uuid: selectedLocation.uuid
                }, { path: '/', expires: 7 });
                $window.location.reload();
            };

            $scope.changePassword = function () {
                $state.go('changePassword');
            };

            return spinner.forPromise($q.all(init()));
        }]);
