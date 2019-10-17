'use strict';

angular.module('bahmni.common.conceptSet')
    .factory('bmiCalculationService', ['$http', function ($http) {
        var getNutritionalStatusKey = function (patientAgeYears, bmi, gender, height, weight) {
            var dataSource = " ";
            var key;
            if (patientAgeYears > 5) {
                if (bmi < 16) {
                    key = "CO_SAM";
                }

                if (bmi >= 16 && bmi <= 16.99) {
                    key = "CO_MAM";
                }

                if (bmi >= 17 && bmi <= 18.49) {
                    key = "CO_LAM";
                }

                if (bmi >= 18.5 && bmi <= 24.9) {
                    key = "CO_Normal";
                }

                if (bmi >= 25 && bmi <= 29.9) {
                    key = "CO_Overweight";
                }

                if (bmi >= 30 && bmi <= 34.9) {
                    key = "CO_OneDO";
                }

                if (bmi > 35 && bmi <= 39.9) {
                    key = "CO_TwoDO";
                }

                if (bmi >= 40) {
                    key = "CO_ThreeDO";
                }

                return key;
            }
            else if (patientAgeYears < 5) {
                if (gender === "M") {
                    dataSource = "twoToFiveMale";
                    if (patientAgeYears < 2) {
                        dataSource = "zeroToTwoMale";
                    }
                } else {
                    dataSource = "twoToFiveFemale";
                    if (patientAgeYears < 2) {
                        dataSource = "zeroToTwoFemale";
                    }
                }

                for (var i = 0; i < childrensBMI[dataSource].length; i++) {
                    if (height == childrensBMI[dataSource][i].height) {
                        var severeObese = parseFloat(childrensBMI[dataSource][i].severe_obese.replace(",", "."));

                        var obeseSplit = childrensBMI[dataSource][i].obese.split("-");
                        var obeseMin = parseFloat(obeseSplit[0].replace(",", "."));
                        var obeseMax = parseFloat(obeseSplit[1].replace(",", "."));

                        var normalSplit = childrensBMI[dataSource][i].normal.split("-");
                        var normalMin = parseFloat(normalSplit[0].replace(",", "."));
                        var normalMax = parseFloat(normalSplit[1].replace(",", "."));

                        var malnutritionSplit = childrensBMI[dataSource][i].malnutrition.split("-");
                        var malnutritionMin = parseFloat(malnutritionSplit[0].replace(",", "."));
                        var malnutritionMax = parseFloat(malnutritionSplit[1].replace(",", "."));

                        var severeMalnutrition = parseFloat(childrensBMI[dataSource][i].severe_malnutrition.replace(",", "."));

                        if (weight > severeObese) {
                            key = "CO_Obese";
                        }
                        if (weight >= obeseMin && weight <= obeseMax) {
                            key = "CO_Overweight";
                        }
                        if (weight >= normalMin && weight <= normalMax) {
                            key = "CO_Normal";
                        }
                        if (weight >= malnutritionMin && weight <= malnutritionMax) {
                            key = "CO_MAM";
                        }
                        if (weight < severeMalnutrition) {
                            key = "CO_SAM";
                        }
                    }
                }

                return key;
            }
        };
        return {
            getNutritionalStatusKey: getNutritionalStatusKey
        };
    }]);
