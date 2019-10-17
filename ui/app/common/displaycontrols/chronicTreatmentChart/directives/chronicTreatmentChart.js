'use strict';

angular.module('bahmni.common.displaycontrol.chronicTreatmentChart').directive('chronicTreatmentChart', ['$translate', 'spinner', 'drugService', 'conceptSetService',
    function ($translate, spinner, drugService, conceptSetService) {
        var link = function ($scope, element) {
            $scope.config = $scope.isOnDashboard ? $scope.section.dashboardConfig : $scope.section.expandedViewConfig;
            var patient = $scope.patient;
            $scope.allARVDrugs = [];
            $scope.arvDrugsChecked = [];

            var init = function () {
                return drugService.getRegimen(patient.uuid, $scope.enrollment, $scope.config.drugs).success(function (data) {
                    var fetchAllARVDrugs = function () {
                        conceptSetService.getAllDrugs().then(function (response) {
                            var allDrugs = response.data.results;
                            for (var i = 0; i < allDrugs.length; i++) {
                                if (allDrugs[i].dosageForm.display === 'ARV') {
                                    $scope.allARVDrugs.push(allDrugs[i].name);
                                }
                            }
                            checkForARVDrugs();
                        });
                    };

                    var checkForARVDrugs = function () {
                        for (var i = 0; i < data.headers.length; i++) {
                            for (var j = 0; j < $scope.allARVDrugs.length; j++) {
                                if (data.headers[i].name === $scope.allARVDrugs[j]) {
                                    $scope.arvDrugsChecked.push(data.headers[i]);
                                }
                            }
                        }
                    };

                    var filterNullRow = function () {
                        for (var row in $scope.regimen.rows) {
                            var nullFlag = true;
                            for (var drug in $scope.regimen.rows[row].drugs) {
                                if ($scope.regimen.rows[row].drugs[drug]) {
                                    nullFlag = false;
                                    break;
                                }
                            }
                            if (nullFlag) {
                                $scope.regimen.rows.splice(row, 1);
                            }
                        }
                    };
                    $scope.regimen = data;
                    if (_.isEmpty($scope.regimen.rows)) {
                        $scope.$emit("no-data-present-event");
                    }

                    fetchAllARVDrugs();
                    checkForARVDrugs();
                    filterNullRow();
                });
            };

            $scope.getAbbreviation = function (concept) {
                var result;

                if (concept && concept.mappings && concept.mappings.length > 0 && $scope.section.headingConceptSource) {
                    result = _.result(_.find(concept.mappings, {"source": $scope.section.headingConceptSource}), "code");
                    result = $translate.instant(result);
                }

                return result || concept.shortName || concept.name;
            };

            $scope.isMonthNumberRequired = function () {
                var month = $scope.regimen && $scope.regimen.rows && $scope.regimen.rows[0] && $scope.regimen.rows[0].month;
                return month;
            };

            $scope.isClickable = function () {
                return $scope.isOnDashboard && $scope.section.expandedViewConfig;
            };

            $scope.dialogData = {
                "patient": $scope.patient,
                "section": $scope.section,
                "enrollment": $scope.enrollment
            };

            spinner.forPromise(init(), element);
        };
        return {
            restrict: 'E',
            link: link,
            scope: {
                patient: "=",
                section: "=",
                isOnDashboard: "=",
                enrollment: "="
            },
            templateUrl: '../common/displaycontrols/chronicTreatmentChart/views/chronicTreatmentChart.html'
        };
    }]);
