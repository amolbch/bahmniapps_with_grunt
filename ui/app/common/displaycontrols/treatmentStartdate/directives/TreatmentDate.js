'use strict';

angular.module('bahmni.common.displaycontrol.treatmentDate', []);
angular.module('bahmni.common.displaycontrol.treatmentDate')
    .directive('treatmentDate', ['ngDialog', function (ngDialog) {
        var controller = function ($scope, $rootScope) {
            $scope.statuses = ['ACTIVE'];

            $scope.openSummaryDialog = function () {
                ngDialog.open({
                    template: '../common/displaycontrols/treatmentStartdate/views/treatmentDate.html',
                    className: 'ngdialog-theme-default ng-dialog-all-details-page',
                    data: {
                        allergies: $scope.allergies
                    },
                    controller: function ($scope) {
                        $scope.hideTitle = true;
                        $scope.statuses = ['ACTIVE'];
                        $scope.allergies = $scope.ngDialogData.allergies;
                    }
                });
            };
            $scope.treatmentStartDate = $rootScope.arvdispenseddate;
        };
        return {
            restrict: 'E',
            controller: controller,
            templateUrl: "../common/displaycontrols/treatmentStartdate/views/treatmentDate.html",
            scope: {
                params: "=",
                patient: "="
            }
        };
    }]);
