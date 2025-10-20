
export class StockService {
    static initialiserStockProduits() {
      if (!localStorage.getItem('stockProduits')) {
        const produits = JSON.parse(localStorage.getItem('products')) || [];
        const produitsCustom = JSON.parse(localStorage.getItem('customProductTypes')) || [];
        const fournisseurs = JSON.parse(localStorage.getItem('suppliers')) || [];
        
        const stockProduits = {};
        
        // Migration des produits existants
        const tousProduits = [...produits, ...produitsCustom];
        tousProduits.forEach(produit => {
          const id = produit.id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          stockProduits[id] = {
            id: id,
            nom: produit.label || produit.name || 'Produit sans nom',
            categorie: produit.category || 'Général',
            description: produit.description || '',
            unite: produit.unit || 'unité',
            stockActuel: produit.stockActuel || produit.currentStock || 0,
            stockMinimum: produit.stockMinimum || produit.minStock || 0,
            stockSecurite: 5,
            stockMaximum: produit.stockMaximum || 1000,
            prixAchatMoyen: produit.price || produit.prixAchatMoyen || 0,
            prixVente: produit.prixVente || 0,
            derniereMAJPrix: new Date().toISOString(),
            fournisseurs: [],
            historiqueMouvements: [],
            dernieresLivraisons: [],
            dateCreation: new Date().toISOString(),
            dateModification: new Date().toISOString(),
            actif: true,
            emplacement: produit.emplacement || 'Entrepôt principal'
          };
        });
  
        // Associer les fournisseurs aux produits
        fournisseurs.forEach(fournisseur => {
          if (fournisseur.productTypes) {
            fournisseur.productTypes.forEach(prodType => {
              const produitId = prodType.id;
              if (stockProduits[produitId]) {
                const fournisseurExiste = stockProduits[produitId].fournisseurs.find(
                  f => f.id === fournisseur.id
                );
                
                if (!fournisseurExiste) {
                  stockProduits[produitId].fournisseurs.push({
                    id: fournisseur.id,
                    nom: fournisseur.name,
                    estPrincipal: false,
                    delaiLivraison: parseInt(fournisseur.deliveryTime) || 2,
                    prixAchat: prodType.price || 0,
                    actif: true
                  });
                }
              }
            });
          }
        });
        
        localStorage.setItem('stockProduits', JSON.stringify(stockProduits));
        console.log('🔄 Initialisation de stockProduits terminée');
      }
    }
  
    static migrerProduitsAvecAnciensIDs() {
      try {
        const stockProduits = this.getStockProduits();
        const commandes = JSON.parse(localStorage.getItem('procurement_orders')) || [];
        let migrations = 0;
  
        commandes.forEach(commande => {
          if (commande.produits) {
            commande.produits.forEach(produitCommande => {
              const ancienID = produitCommande.id;
              
              if (!stockProduits[ancienID] && produitCommande.nom) {
                const produitTrouve = Object.values(stockProduits).find(p => 
                  p.nom === produitCommande.nom || 
                  p.nom.toLowerCase() === produitCommande.nom.toLowerCase()
                );
  
                if (produitTrouve) {
                  produitCommande.id = produitTrouve.id;
                  migrations++;
                  console.log(`🔄 Migration: ${ancienID} -> ${produitTrouve.id} (${produitCommande.nom})`);
                } else {
                  console.warn(`❌ Produit non trouvé pour migration: ${ancienID} - ${produitCommande.nom}`);
                }
              }
            });
          }
        });
  
        if (migrations > 0) {
          localStorage.setItem('procurement_orders', JSON.stringify(commandes));
          console.log(`✅ ${migrations} produits migrés avec succès`);
        }
  
        return migrations;
      } catch (error) {
        console.error('❌ Erreur lors de la migration des IDs:', error);
        return 0;
      }
    }
  
    static getStockProduits() {
      return JSON.parse(localStorage.getItem('stockProduits')) || {};
    }
  
    static getProduit(produitId) {
      const stockProduits = this.getStockProduits();
      return stockProduits[produitId];
    }
  
    static getStockActuel(produitId) {
      const produit = this.getProduit(produitId);
      return produit?.stockActuel || 0;
    }
  
    // NOUVEAU : Méthode pour gérer les changements de statut de manière réversible
    static mettreAJourStockSelonStatut(commande, ancienStatut, nouveauStatut) {
      try {
        console.log(`🔄 Changement de statut: ${ancienStatut} → ${nouveauStatut} pour commande ${commande.numero}`);
        
        // Si la commande devient livrée → AJOUTER les quantités
        if (ancienStatut !== 'livrée' && nouveauStatut === 'livrée') {
          return this.ajouterStock(commande);
        }
        
        // Si la commande n'est plus livrée → RETRANCHER les quantités
        if (ancienStatut === 'livrée' && nouveauStatut !== 'livrée') {
          return this.retirerStock(commande);
        }
        
        console.log(`ℹ️ Aucun ajustement de stock nécessaire pour ce changement de statut`);
        return { modifications: 0, erreurs: [] };
        
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour réversible du stock:', error);
        return { modifications: 0, erreurs: [error.message] };
      }
    }
  
    // Méthode pour AJOUTER du stock (commande livrée)
    static ajouterStock(commande) {
      if (!commande) return { modifications: 0, erreurs: ['Commande invalide'] };
  
      try {
        const stockProduits = this.getStockProduits();
        let modifications = 0;
        let erreurs = [];
  
        commande.produits.forEach(produitCommande => {
          const produitId = produitCommande.id;
          if (!produitId) {
            console.warn('Produit sans ID dans la commande:', produitCommande);
            erreurs.push(`Produit sans ID: ${produitCommande.nom}`);
            return;
          }
  
          const produitStock = stockProduits[produitId];
          if (!produitStock) {
            console.warn(`❌ Produit non trouvé: ${produitId} - ${produitCommande.nom}`);
            erreurs.push(`Produit non trouvé: ${produitCommande.nom}`);
            
            // Recherche par nom
            const produitParNom = Object.values(stockProduits).find(p => 
              p.nom === produitCommande.nom || 
              p.nom.toLowerCase() === produitCommande.nom?.toLowerCase()
            );
            
            if (produitParNom) {
              console.log(`🔍 Produit trouvé par nom: ${produitCommande.nom} -> ${produitParNom.id}`);
              produitCommande.id = produitParNom.id;
              // Rappeler avec le bon ID
              const result = this.ajouterStock({...commande, produits: [{...produitCommande, id: produitParNom.id}]});
              modifications += result.modifications;
              erreurs = [...erreurs, ...result.erreurs];
            }
            return;
          }
  
          const ancienStock = produitStock.stockActuel;
          const quantite = produitCommande.quantite || 0;
  
          // Créer le mouvement d'AJOUT
          const mouvement = {
            id: `MVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'approvisionnement',
            commandeId: commande.id,
            quantite: quantite,
            ancienStock: ancienStock,
            nouveauStock: ancienStock + quantite,
            date: new Date().toISOString(),
            motif: `Livraison commande ${commande.numero || commande.id}`,
            utilisateur: 'system',
            statutCommande: 'livrée'
          };
  
          // Mettre à jour le stock
          produitStock.stockActuel = ancienStock + quantite;
          produitStock.historiqueMouvements.unshift(mouvement);
          produitStock.dateModification = new Date().toISOString();
  
          // Mettre à jour les dernières livraisons
          produitStock.dernieresLivraisons.unshift({
            commandeId: commande.id,
            fournisseurId: commande.fournisseurId,
            quantite: quantite,
            dateLivraison: commande.dateLivraison || new Date().toISOString(),
            prixUnitaire: produitCommande.prixUnitaire,
            statut: 'livrée'
          });
  
          // Garder seulement les 10 dernières livraisons
          if (produitStock.dernieresLivraisons.length > 10) {
            produitStock.dernieresLivraisons = produitStock.dernieresLivraisons.slice(0, 10);
          }
  
          modifications++;
          console.log(`📦 Stock AJOUTÉ: ${produitStock.nom} - ${ancienStock} + ${quantite} = ${ancienStock + quantite}`);
        });
  
        if (modifications > 0) {
          localStorage.setItem('stockProduits', JSON.stringify(stockProduits));
          console.log(`✅ ${modifications} stocks ajoutés avec succès`);
        }
  
        return { modifications, erreurs };
  
      } catch (error) {
        console.error('❌ Erreur lors de l\'ajout du stock:', error);
        return { modifications: 0, erreurs: [error.message] };
      }
    }
  
    // NOUVELLE MÉTHODE : RETIRER du stock (commande annulée ou statut changé)
    static retirerStock(commande) {
      if (!commande) return { modifications: 0, erreurs: ['Commande invalide'] };
  
      try {
        const stockProduits = this.getStockProduits();
        let modifications = 0;
        let erreurs = [];
  
        commande.produits.forEach(produitCommande => {
          const produitId = produitCommande.id;
          if (!produitId) {
            console.warn('Produit sans ID dans la commande:', produitCommande);
            erreurs.push(`Produit sans ID: ${produitCommande.nom}`);
            return;
          }
  
          const produitStock = stockProduits[produitId];
          if (!produitStock) {
            console.warn(`❌ Produit non trouvé: ${produitId} - ${produitCommande.nom}`);
            erreurs.push(`Produit non trouvé: ${produitCommande.nom}`);
            return;
          }
  
          const ancienStock = produitStock.stockActuel;
          const quantite = produitCommande.quantite || 0;
  
          // Vérifier si le stock est suffisant pour le retrait
          if (ancienStock < quantite) {
            const erreurMsg = `Stock insuffisant pour ${produitStock.nom}: ${ancienStock} disponible, ${quantite} demandé`;
            console.warn(`⚠️ ${erreurMsg}`);
            erreurs.push(erreurMsg);
            
            // On retire quand même ce qui est disponible (optionnel)
            // Pour l'instant, on ne retire pas et on signale l'erreur
            return;
          }
  
          // Créer le mouvement de RETRAIT
          const mouvement = {
            id: `MVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'retrait',
            commandeId: commande.id,
            quantite: -quantite, // Négatif pour indiquer un retrait
            ancienStock: ancienStock,
            nouveauStock: ancienStock - quantite,
            date: new Date().toISOString(),
            motif: `Retrait - Commande ${commande.numero || commande.id} (statut modifié)`,
            utilisateur: 'system',
            statutCommande: 'annulée'
          };
  
          // Mettre à jour le stock (retrait)
          produitStock.stockActuel = ancienStock - quantite;
          produitStock.historiqueMouvements.unshift(mouvement);
          produitStock.dateModification = new Date().toISOString();
  
          // Marquer la livraison correspondante comme annulée
          const livraisonIndex = produitStock.dernieresLivraisons.findIndex(
            l => l.commandeId === commande.id
          );
          
          if (livraisonIndex !== -1) {
            produitStock.dernieresLivraisons[livraisonIndex].statut = 'annulée';
          }
  
          modifications++;
          console.log(`📦 Stock RETIRÉ: ${produitStock.nom} - ${ancienStock} - ${quantite} = ${ancienStock - quantite}`);
        });
  
        if (modifications > 0) {
          localStorage.setItem('stockProduits', JSON.stringify(stockProduits));
          console.log(`✅ ${modifications} stocks retirés avec succès`);
        }
  
        return { modifications, erreurs };
  
      } catch (error) {
        console.error('❌ Erreur lors du retrait du stock:', error);
        return { modifications: 0, erreurs: [error.message] };
      }
    }
  
    // MÉTHODE EXISTANTE (conservée pour compatibilité)
    static mettreAJourStock(commande) {
      if (!commande || commande.statut !== 'livrée') return;
  
      try {
        const stockProduits = this.getStockProduits();
        let modifications = false;
        let produitsNonTrouves = [];
  
        commande.produits.forEach(produitCommande => {
          const produitId = produitCommande.id;
          if (!produitId) {
            console.warn('Produit sans ID dans la commande:', produitCommande);
            produitsNonTrouves.push(produitCommande.nom || 'Produit sans nom');
            return;
          }
  
          const produitStock = stockProduits[produitId];
          if (!produitStock) {
            console.warn(`❌ Produit non trouvé dans stockProduits: ${produitId} - ${produitCommande.nom}`);
            produitsNonTrouves.push(produitCommande.nom || produitId);
            
            const produitParNom = Object.values(stockProduits).find(p => 
              p.nom === produitCommande.nom || 
              p.nom.toLowerCase() === produitCommande.nom?.toLowerCase()
            );
            
            if (produitParNom) {
              console.log(`🔍 Produit trouvé par nom: ${produitCommande.nom} -> ${produitParNom.id}`);
              produitCommande.id = produitParNom.id;
              this.mettreAJourStock({...commande, produits: [{...produitCommande, id: produitParNom.id}]});
            }
            return;
          }
  
          const ancienStock = produitStock.stockActuel;
          const quantite = produitCommande.quantite || 0;
  
          const mouvement = {
            id: `MVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'approvisionnement',
            commandeId: commande.id,
            quantite: quantite,
            ancienStock: ancienStock,
            nouveauStock: ancienStock + quantite,
            date: new Date().toISOString(),
            motif: `Livraison commande ${commande.numero || commande.id}`,
            utilisateur: 'system'
          };
  
          produitStock.stockActuel = ancienStock + quantite;
          produitStock.historiqueMouvements.unshift(mouvement);
          produitStock.dateModification = new Date().toISOString();
  
          produitStock.dernieresLivraisons.unshift({
            commandeId: commande.id,
            fournisseurId: commande.fournisseurId,
            quantite: quantite,
            dateLivraison: commande.dateLivraison || new Date().toISOString(),
            prixUnitaire: produitCommande.prixUnitaire
          });
  
          if (produitStock.dernieresLivraisons.length > 10) {
            produitStock.dernieresLivraisons = produitStock.dernieresLivraisons.slice(0, 10);
          }
  
          modifications = true;
          console.log(`📦 Stock mis à jour: ${produitStock.nom} - ${ancienStock} + ${quantite} = ${ancienStock + quantite}`);
        });
  
        if (modifications) {
          localStorage.setItem('stockProduits', JSON.stringify(stockProduits));
          console.log('✅ Stocks mis à jour avec succès dans stockProduits');
        }
  
        if (produitsNonTrouves.length > 0) {
          console.warn(`⚠️ Produits non trouvés: ${produitsNonTrouves.join(', ')}`);
        }
  
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du stock:', error);
      }
    }
  
    static synchroniserTousLesStocks() {
      try {
        this.initialiserStockProduits();
        this.migrerProduitsAvecAnciensIDs();
        
        const commandes = JSON.parse(localStorage.getItem('procurement_orders')) || [];
        const commandesLivrees = commandes.filter(cmd => cmd.statut === 'livrée');
  
        console.log(`🔄 Synchronisation de ${commandesLivrees.length} commandes livrées`);
        
        commandesLivrees.forEach(commande => {
          this.mettreAJourStock(commande);
        });
  
        return commandesLivrees.length;
      } catch (error) {
        console.error('❌ Erreur lors de la synchronisation des stocks:', error);
        return 0;
      }
    }
  
    static creerOuMettreAJourProduit(produitData) {
      try {
        const stockProduits = this.getStockProduits();
        const id = produitData.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (!stockProduits[id]) {
          stockProduits[id] = {
            id: id,
            nom: produitData.nom,
            categorie: produitData.categorie || 'Général',
            description: produitData.description || '',
            unite: produitData.unite || 'unité',
            stockActuel: 0,
            stockMinimum: produitData.stockMinimum || 0,
            stockSecurite: 5,
            stockMaximum: produitData.stockMaximum || 1000,
            prixAchatMoyen: produitData.prixAchat || 0,
            prixVente: produitData.prixVente || 0,
            derniereMAJPrix: new Date().toISOString(),
            fournisseurs: [],
            historiqueMouvements: [],
            dernieresLivraisons: [],
            dateCreation: new Date().toISOString(),
            dateModification: new Date().toISOString(),
            actif: true,
            emplacement: 'Entrepôt principal'
          };
        }
  
        if (produitData.fournisseurId) {
          const fournisseurExiste = stockProduits[id].fournisseurs.find(
            f => f.id === produitData.fournisseurId
          );
          
          if (!fournisseurExiste) {
            stockProduits[id].fournisseurs.push({
              id: produitData.fournisseurId,
              nom: produitData.fournisseurNom,
              estPrincipal: produitData.estPrincipal || false,
              delaiLivraison: produitData.delaiLivraison || 2,
              prixAchat: produitData.prixAchat || 0,
              actif: true
            });
          }
        }
  
        localStorage.setItem('stockProduits', JSON.stringify(stockProduits));
        return stockProduits[id];
      } catch (error) {
        console.error('❌ Erreur lors de la création/mise à jour du produit:', error);
        return null;
      }
    }
  
    static getProduitsParFournisseur(fournisseurId) {
      const stockProduits = this.getStockProduits();
      return Object.values(stockProduits).filter(produit => 
        produit.fournisseurs.some(f => f.id === fournisseurId && f.actif)
      );
    }
  
    static getStatutStock(produitId) {
      const produit = this.getProduit(produitId);
      if (!produit) return 'inconnu';
      
      const stockActuel = produit.stockActuel;
      const stockMinimum = produit.stockMinimum;
      
      if (stockActuel === 0) return 'rupture';
      if (stockActuel <= stockMinimum) return 'bas';
      return 'suffisant';
    }
  
    static forcerMigrationComplete() {
      try {
        console.log('🔄 Début de la migration forcée...');
        
        this.initialiserStockProduits();
        const migrations = this.migrerProduitsAvecAnciensIDs();
        const synchronisations = this.synchroniserTousLesStocks();
        
        console.log(`✅ Migration forcée terminée : ${migrations} IDs migrés, ${synchronisations} commandes synchronisées`);
        
        return { migrations, synchronisations };
      } catch (error) {
        console.error('❌ Erreur lors de la migration forcée:', error);
        return { migrations: 0, synchronisations: 0 };
      }
    }
  }