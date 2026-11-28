from unittest import TestCase, main
from controle_sirene import evidence, valid_siret
from construire_v26 import merge, layer

ROW = {'id':'local','nom':'Ten Belles Bread','adresse':'17 bis rue Bréguet','code_postal':'75011'}
ESTABLISHMENT = {'siret':'81748894300017','code_postal':'75011','adresse':'17 BIS RUE BREGUET 75011 PARIS 11',
                 'nom_commercial':None,'liste_enseignes':None,'etat_administratif':'A',
                 'activite_principale':'56.10C','date_creation':None,'date_fermeture':None,'date_mise_a_jour_insee':None}
UNIT = {'siren':'817488943','denomination':'TEN BELLES BREAD','nom_complet':'TEN BELLES BREAD','sites':[ESTABLISHMENT]}

class Verification(TestCase):
    def test_siret_and_branch(self):
        self.assertTrue(valid_siret(ESTABLISHMENT['siret']))
        self.assertFalse(valid_siret('81748894300018'))
        status, chosen, _, _ = evidence(ROW,[{'results':[UNIT]}])
        self.assertEqual(status,'actif_administrativement')
        self.assertEqual(chosen['siret'],ESTABLISHMENT['siret'])

    def test_address_alone_and_wrong_number(self):
        status, chosen, _, _ = evidence(dict(ROW,nom='Autre enseigne'),[{'results':[UNIT]}])
        self.assertEqual(status,'correspondance_ambigue')
        self.assertIsNone(chosen)
        status, chosen, _, _ = evidence(dict(ROW,adresse='17 rue Bréguet'),[{'results':[UNIT]}])
        self.assertEqual(status,'aucune_correspondance_trouvee')
        self.assertIsNone(chosen)

    def test_merge_twice_and_commercial_remains_separate(self):
        status, chosen, others, note = evidence(ROW,[{'results':[UNIT]}])
        checks = {'local':dict(resultat=status,candidat=chosen,candidats=others,justification=note,
             methode='nom_et_adresse_etablissement',date='2026-11-28',confiance='forte')}
        original = [dict(ROW, activite_commerciale_effective='a_verifier')]
        result = merge(original,checks,{},{})
        self.assertEqual(merge(result,checks,{},{}),result)
        self.assertNotIn('siret',original[0])
        self.assertEqual(result[0]['activite_commerciale_effective'],'a_verifier')
        self.assertEqual(result[0]['etat_sirene'],'A')

    def test_projection_excludes_uncertain_and_commercially_closed(self):
        fixture = dict(ROW,quartier_officiel='7511101',nom_quartier_officiel='Folie-Méricourt',arrondissement_spatial=11,
            latitude=48.85,longitude=2.36,geocodage_confiance='forte_adresse',etat_sirene='F')
        wanted = layer([fixture,dict(fixture,territoire_a_confirmer=True),
                        dict(fixture,activite_commerciale_effective='ferme_definitivement')],'2026-11-28')
        self.assertEqual(len(wanted['places']),1)
        self.assertNotIn('etat_sirene',wanted['places'][0])
        self.assertNotIn('openingVerified',wanted['places'][0])

if __name__=='__main__':
    main()
