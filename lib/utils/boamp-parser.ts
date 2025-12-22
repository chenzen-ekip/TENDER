// Helper pour parser intelligemment les données BOAMP
export function parseBoampData(donnees: any, rawData: any): string {
    let details = '';

    // MONTANT ESTIMÉ (parsing intelligent de la structure XML -> JSON)
    if (donnees.CONTRAT?.['cac:RequestedTenderTotal']?.['cbc:EstimatedOverallContractAmount']) {
        const montantData = donnees.CONTRAT['cac:RequestedTenderTotal']['cbc:EstimatedOverallContractAmount'];
        const montant = montantData['#text'] || montantData;
        const devise = montantData['@currencyID'] || 'EUR';
        const montantNum = parseInt(montant);
        details += `\n\n    💰 MONTANT ESTIMÉ: ${montantNum.toLocaleString('fr-FR')} ${devise} HT`;
        if (montantNum >= 1000000) {
            details += ` (${(montantNum / 1000000).toFixed(2)}M€)`;
        }
    } else if (donnees.MONTANT) {
        details += `\n\n    💰 MONTANT ESTIMÉ: ${JSON.stringify(donnees.MONTANT)}`;
    }

    // DURÉE (parsing intelligent)
    if (donnees.CONTRAT?.['cac:PlannedPeriod']?.['cbc:DurationMeasure']) {
        const dureeData = donnees.CONTRAT['cac:PlannedPeriod']['cbc:DurationMeasure'];
        const dureeNombre = dureeData['#text'] || dureeData;
        const unite = dureeData['@unitCode'] || 'MONTH';
        const unitesFr: { [key: string]: string } = {
            'MONTH': 'mois',
            'DAY': 'jours',
            'YEAR': 'ans'
        };
        const dureeNum = parseInt(dureeNombre);
        details += `\n    ⏱️ DURÉE: ${dureeNum} ${unitesFr[unite] || unite}`;
        if (unite === 'MONTH' && dureeNum >= 12) {
            details += ` (soit ${Math.round(dureeNum / 12)} ans)`;
        }
    } else if (donnees.DUREE) {
        details += `\n    ⏱️ DURÉE: ${JSON.stringify(donnees.DUREE)}`;
    }

    // DATE DE DÉBUT
    if (donnees.CONTRAT?.['cac:PlannedPeriod']?.['cbc:StartDate']) {
        const dateDebut = donnees.CONTRAT['cac:PlannedPeriod']['cbc:StartDate'];
        details += `\n    📅 DATE DE DÉBUT PRÉVUE: ${dateDebut}`;
    }

    // LIEU D'EXÉCUTION
    if (donnees.CONTRAT?.['cac:RealizedLocation']?.['cac:Address']) {
        const address = donnees.CONTRAT['cac:RealizedLocation']['cac:Address'];
        const ville = address['cbc:CityName'] || '';
        const codePostal = address['cbc:PostalZone'] || '';
        const departement = address['cbc:CountrySubentityCode']?.['#text'] || rawData.code_departement;

        details += `\n    📍 LIEU D'EXÉCUTION: ${ville}`;
        if (codePostal) details += ` (${codePostal})`;
        details += ` - Département ${departement}`;
    } else if (donnees.LIEU_EXEC) {
        details += `\n    📍 LIEU: ${JSON.stringify(donnees.LIEU_EXEC)}`;
    }

    // DATE LIMITE DE RÉPONSE
    if (donnees.PROCEDURE?.['cbc:SubmissionDeadline']) {
        const deadline = donnees.PROCEDURE['cbc:SubmissionDeadline'];
        details += `\n    ⏰ DATE LIMITE DE RÉPONSE: ${deadline}`;
    }

    // CONTACT (si disponible)
    if (donnees.CONTRAT?.['cac:ContractingParty']?.['cac:Party']?.['cac:Contact']) {
        const contact = donnees.CONTRAT['cac:ContractingParty']['cac:Party']['cac:Contact'];
        const nom = contact['cbc:Name'] || '';
        const tel = contact['cbc:Telephone'] || '';
        const email = contact['cbc:ElectronicMail'] || '';

        if (nom) {
            details += `\n    👤 CONTACT: ${nom}`;
            if (tel) details += ` - Tél: ${tel}`;
            if (email) details += ` - Email: ${email}`;
        }
    }

    return details;
}
