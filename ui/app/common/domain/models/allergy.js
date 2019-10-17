'use strict';

(function () {
    var DateUtil = Bahmni.Common.Util.DateUtil;
    var Allergies = Bahmni.Common.Domain.Allergies = {};
    var Allergy = Bahmni.Common.Domain.Allergy = function (data) {
        data = data || {};
        this.uuid = data.uuid;
        this.concept = {
            uuid: _.get(data, 'concept.uuid'),
            shortName: _.get(data, 'concept.shortName'),
            name: _.get(data, 'concept.name')
        };
        this.status = data.status;
        this.onSetDate = data.onSetDate;
        this.allergyNonCoded = data.allergyNonCoded;
        this.voided = data.voided;
        this.additionalDetail = data.additionalDetail;
        this.isNonCoded = data.isNonCoded;
        this.creator = data.creator;
        this.previousAllergyUuid = data.previousAllergyUuid;
        this.activeSince = data.onSetDate;
    };
    Allergy.prototype = {};
    Allergy.prototype.toggleNonCoded = function () {
        this.isNonCoded = !this.isNonCoded;
    };
    Allergy.prototype.clearConcept = function () {
        this.concept.uuid = undefined;
    };
    Allergy.prototype.isValidConcept = function () {
        return !(this.concept.name && !this.concept.uuid && !this.isNonCoded);
    };
    Allergy.prototype.isValid = function () {
        return this.status && ((this.concept.name && this.isNonCoded) || this.concept.uuid);
    };
    Allergy.prototype.isActive = function () {
        return this.status == 'ACTIVE';
    };
    Allergy.prototype.displayString = function () {
        return this.allergyNonCoded || this.concept.shortName || this.concept.name;
    };
    Allergy.prototype.isEmpty = function () {
        return !this.status && !this.concept.name && !(this.isNonCoded || this.concept.uuid)
            && !this.onSetDate && !this.additionalDetail;
    };

    Allergy.createFromDiagnosis = function (diagnosis) {
        return new Allergy({
            concept: {
                uuid: diagnosis.codedAnswer.uuid,
                shortName: diagnosis.codedAnswer.shortName,
                name: diagnosis.codedAnswer.name
            },
            status: 'ACTIVE',
            onSetDate: DateUtil.today(),
            allergyNonCoded: diagnosis.freeTextAnswer,
            additionalDetail: diagnosis.comments,
            voided: false
        });
    };

    Allergies.fromAllergyHistories = function (allergiesHistories) {
        return _.map(allergiesHistories, function (allergiesHistory) {
            var allergies = allergiesHistory.allergies;
            return new Allergy(_.last(_.sortBy(_.reject(allergies, 'endDate'), 'onSetDate')));
        });
    };

    Allergies.getPreviousActiveAllergy = function (allergy, allAllergies) {
        if (allergy.status == 'ACTIVE') {
            return allergy;
        }
        var previousAllergy = _.find(allAllergies, {uuid: allergy.previousAllergyUuid});
        if (!previousAllergy) {
            return allergy;
        }
        return Allergies.getPreviousActiveAllergy(previousAllergy, allAllergies);
    };
})();
