'use strict';
angular.module('bahmni.clinical')
    .directive('prescriptionReport', function () {
        var controller = function ($scope) {
            $scope.getCurrentDate = function () {
                return moment().format('DD/MM/YYYY');
            };

            $scope.getFullname = function () {
                if ($scope.isTarvReport) {
                    return $scope.data.patientInfo.firstName.substring(0, 3) + ' ' + $scope.data.patientInfo.lastName.substring(0, 3);
                } else {
                    return $scope.data.patientInfo.firstName + ' ' + $scope.data.patientInfo.lastName;
                }
            };
        };

        return {
            restrict: 'E',
            controller: controller,
            scope: {
                data: "=",
                isTarvReport: "="
            },
            templateUrl: "dashboard/views/prescriptionReport.html"
        };
    });
