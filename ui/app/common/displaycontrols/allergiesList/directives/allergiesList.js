'use strict';

angular.module('bahmni.common.displaycontrol.allergiesList', []);
angular.module('bahmni.common.displaycontrol.allergiesList')
    .directive('allergiesList', ['allergiesService', 'ngDialog', function (allergiesService, ngDialog) {
        var controller = function ($scope) {
            $scope.statuses = ['ACTIVE'];

            $scope.openSummaryDialog = function () {
                ngDialog.open({
                    template: '../common/displaycontrols/allergiesList/views/allergiesList.html',
                    className: 'ngdialog-theme-default ng-dialog-all-details-page',
                    data: {allergies: $scope.allergies},
                    controller: function ($scope) {
                        $scope.hideTitle = true;
                        $scope.statuses = ['ACTIVE'];
                        $scope.allergies = $scope.ngDialogData.allergies;
                    }
                });
            };

            return allergiesService.getAllergies($scope.patient.uuid).then(function (allergies) {
                $scope.allergies = allergies;
            });
        };
        return {
            restrict: 'E',
            controller: controller,
            templateUrl: "../common/displaycontrols/allergiesList/views/allergiesList.html",
            scope: {
                params: "=",
                patient: "="
            }
        };
    }]);
