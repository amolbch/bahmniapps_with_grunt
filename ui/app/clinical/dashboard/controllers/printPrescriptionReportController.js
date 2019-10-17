/* eslint-disable eol-last */
'use strict';
angular.module('bahmni.clinical')
    .controller('PrintPrescriptionReportController', ['$scope', '$rootScope',
        function ($scope, $rootScope) {
            $scope.isTarvReport = $rootScope.isTarvReport;
            $scope.data = $rootScope.prescriptionReportData;
        }]);