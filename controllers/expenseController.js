import Expense from '../models/Expense.js';
import BaseProduct from '../models/BaseProduct.js';
import Supplier from '../models/Supplier.js';

export const calculateExpenses = async (req, res) => {
    try {
        const { finishedProduct, ingredients, quantityProduced, logisticsCost = 0 } = req.body;

        console.log('🔍 Calcul avec ingrédients:', ingredients);

        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Liste des ingrédients requise'
            });
        }

        let totalIngredientsCost = 0;
        const detailedCosts = [];
        const calculationErrors = [];

        // CORRECTION: Calcul avec transport par ingrédient
        for (const [index, ingredient] of ingredients.entries()) {
            const { productId, quantityUsed, unitPrice, name, logisticsCost: ingredientLogistics = 0 } = ingredient;
            
            try {
                let finalUnitPrice = unitPrice;

                if (!finalUnitPrice || finalUnitPrice <= 0) {
                    const baseProduct = await BaseProduct.findById(productId);
                    
                    if (!baseProduct) {
                        calculationErrors.push({
                            productId,
                            name: name || 'Produit inconnu',
                            error: 'Produit non trouvé dans la base'
                        });
                        continue;
                    }

                    finalUnitPrice = baseProduct.price || baseProduct.unitPrice || baseProduct.purchasePrice || 0;
                    
                    if (!finalUnitPrice || finalUnitPrice <= 0) {
                        calculationErrors.push({
                            ingredient: name || baseProduct.name,
                            error: `Prix unitaire invalide: ${finalUnitPrice}`
                        });
                        continue;
                    }
                }

                if (!quantityUsed || quantityUsed <= 0) {
                    calculationErrors.push({
                        ingredient: name,
                        error: `Quantité utilisée invalide: ${quantityUsed}`
                    });
                    continue;
                }

                // CORRECTION: Coût de base + transport de l'ingrédient
                const baseCost = finalUnitPrice * quantityUsed;
                const totalIngredientCost = baseCost + (ingredientLogistics || 0);
                totalIngredientsCost += totalIngredientCost;

                detailedCosts.push({
                    ingredient: {
                        id: productId,
                        name: name,
                        unit: ingredient.unit,
                        category: ingredient.category
                    },
                    quantityUsed,
                    unitCost: finalUnitPrice,
                    baseCost: baseCost, // Coût sans transport
                    logisticsCost: ingredientLogistics || 0, // Transport individuel
                    totalCost: totalIngredientCost, // Coût total avec transport
                    calculationDetails: {
                        source: unitPrice ? 'provided' : 'database'
                    }
                });

                console.log(`✅ ${name}: ${quantityUsed} x ${finalUnitPrice} + ${ingredientLogistics} = ${totalIngredientCost}`);

            } catch (error) {
                console.error(`❌ Erreur ingrédient ${productId}:`, error);
                calculationErrors.push({
                    productId,
                    name: name || 'Produit inconnu',
                    error: error.message
                });
            }
        }

        if (calculationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Erreurs lors du calcul',
                errors: calculationErrors
            });
        }

        if (detailedCosts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucun ingrédient valide'
            });
        }

        // CORRECTION: Coût total = ingrédients (avec leurs transports) + transport global
        const finalLogisticsCost = parseFloat(logisticsCost || 0);
        const totalCost = totalIngredientsCost + finalLogisticsCost;
        const unitCost = quantityProduced > 0 ? totalCost / quantityProduced : 0;

        const result = {
            finishedProduct,
            quantityProduced,
            totalIngredientsCost,
            logisticsCost: finalLogisticsCost,
            totalCost,
            unitCost,
            detailedCosts,
            calculationDate: new Date(),
            summary: {
                ingredientsCount: detailedCosts.length,
                totalWithLogistics: totalCost
            }
        };

        console.log('📊 Résultat final:', result);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('💥 Erreur calcul dépenses:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du calcul des dépenses',
            error: error.message
        });
    }
};
// =========================================================================
// CONTRÔLEUR POUR CALCULER ET SAUVEGARDER (Solution pour la permanence)
// =========================================================================
export const calculateAndSaveExpense = async (req, res) => {
    try {
        const { 
            finishedProduct, 
            ingredients, 
            quantityProduced, 
            logisticsCost = 0, 
            date, 
            supplier, 
            notes 
        } = req.body;

        console.log('🔍 Données reçues pour calcul et sauvegarde:', {
            finishedProduct,
            ingredientsCount: ingredients?.length,
            quantityProduced,
            supplier
        });

        // Validation des données
        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Liste des ingrédients requise'
            });
        }

        if (!finishedProduct || !supplier) {
            return res.status(400).json({
                success: false,
                message: 'Nom du produit fini et fournisseur requis'
            });
        }

        let totalIngredientsCost = 0;
        const detailedCostsForSave = [];
        const calculationErrors = [];

        // Calcul des coûts avec gestion d'erreur
        for (const ingredient of ingredients) {
            try {
                const { productId, quantityUsed, logisticsCost: ingredientLogistics = 0 } = ingredient;
                
                const baseProduct = await BaseProduct.findById(productId);
                if (!baseProduct) {
                    calculationErrors.push({
                        productId,
                        error: 'Produit de base non trouvé'
                    });
                    continue;
                }

                const unitCost = baseProduct.price || baseProduct.unitPrice || baseProduct.purchasePrice || 0;
                if (!unitCost || unitCost <= 0) {
                    calculationErrors.push({
                        product: baseProduct.name,
                        error: `Prix unitaire invalide: ${unitCost}`
                    });
                    continue;
                }

                const baseCost = unitCost * quantityUsed;
                const totalIngredientCost = baseCost + (ingredientLogistics || 0);
                totalIngredientsCost += totalIngredientCost;

                detailedCostsForSave.push({
                    ingredient: baseProduct._id,
                    quantityUsed,
                    unitCost,
                    totalCost: totalIngredientCost,
                    logisticsCost: ingredientLogistics
                });

            } catch (error) {
                calculationErrors.push({
                    ingredient: ingredient.productId,
                    error: error.message
                });
            }
        }

        if (calculationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Erreurs lors du calcul des ingrédients',
                errors: calculationErrors
            });
        }

        // Calcul des coûts finaux
        const finalLogisticsCost = parseFloat(logisticsCost || 0);
        const totalCost = totalIngredientsCost + finalLogisticsCost;
        const unitCost = quantityProduced > 0 ? totalCost / quantityProduced : 0;

        // Création de la dépense
        const expenseData = {
            name: finishedProduct,
            description: `Produit fini: ${finishedProduct}`,
            productType: finishedProduct,
            quantityProduced,
            totalCost,
            unitCost,
            logisticsCost: finalLogisticsCost,
            ingredients: detailedCostsForSave,
            supplier,
            date: date || new Date(),
            notes,
            establishment: req.user.establishment,
            createdBy: req.user._id
        };

        const expense = new Expense(expenseData);
        await expense.save();

        // Peuplement des références pour la réponse
        await expense.populate('supplier', 'name contact');
        await expense.populate('ingredients.ingredient', 'name unit category');

        console.log('✅ Dépense sauvegardée avec succès:', expense._id);

        res.status(201).json({
            success: true,
            message: 'Dépense calculée et sauvegardée avec succès!',
            data: { expense }
        });

    } catch (error) {
        console.error('💥 Erreur calcul et sauvegarde:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du calcul et de la sauvegarde',
            error: error.message
        });
    }
};
// =========================================================================
// Sauvegarder une dépense (Manuelle)
export const createExpense = async (req, res) => {
    try {
        // ... (votre code createExpense original)
        const expenseData = {
            ...req.body,
            establishment: req.user.establishment,
            createdBy: req.user._id
        };

        const expense = new Expense(expenseData);
        await expense.save();

        // Populer les références pour la réponse
        await expense.populate('supplier', 'name contact');
        await expense.populate('ingredients.ingredient', 'name unit category');

        res.status(201).json({
            success: true,
            data: expense
        });

    } catch (error) {
        console.error('Erreur création dépense:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de la dépense',
            error: error.message
        });
    }
};
// Récupérer les dépenses
export const getExpenses = async (req, res) => {
    // ... (votre code getExpenses original)
    try {
        const { 
            startDate, 
            endDate, 
            supplierId, 
            productType,
            page = 1,
            limit = 50
        } = req.query;

        const filter = { establishment: req.user.establishment };

        // Filtres date
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        if (supplierId && supplierId !== 'null') filter.supplier = supplierId;
        if (productType && productType !== '') filter.productType = productType;

        const expenses = await Expense.find(filter)
            .populate('supplier', 'name contact phone')
            .populate('ingredients.ingredient', 'name unit category price')
            .sort({ date: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Expense.countDocuments(filter);

        res.json({
            success: true,
            data: expenses,
            pagination: {
                current: page,
                total: Math.ceil(total / limit),
                results: total
            }
        });

    } catch (error) {
        console.error('Erreur récupération dépenses:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des dépenses'
        });
    }
};
// Obtenir les statistiques
export const getExpenseStats = async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        const establishmentId = req.user.establishment;

        let groupByFormat;
        switch (period) {
            case 'daily':
                groupByFormat = '%Y-%m-%d';
                break;
            case 'weekly':
                groupByFormat = '%Y-%U';
                break;
            case 'yearly':
                groupByFormat = '%Y';
                break;
            default:
                groupByFormat = '%Y-%m';
        }

        const stats = await Expense.aggregate([
            {
                $match: {
                    establishment: establishmentId,
                    date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: groupByFormat,
                            date: '$date'
                        }
                    },
                    totalExpenses: { $sum: '$totalCost' },
                    count: { $sum: 1 },
                    averageCost: { $avg: '$totalCost' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                periodStats: stats,
                totalExpenses: stats.reduce((sum, stat) => sum + stat.totalExpenses, 0)
            }
        });

    } catch (error) {
        console.error('Erreur statistiques dépenses:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du calcul des statistiques'
        });
    }
};
// Mettre à jour une dépense
export const updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('supplier', 'name contact')
        .populate('ingredients.ingredient', 'name unit category');

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Dépense non trouvée'
            });
        }

        res.json({
            success: true,
            data: expense
        });

    } catch (error) {
        console.error('Erreur mise à jour dépense:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour de la dépense'
        });
    }
};
// Supprimer une dépense
export const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Dépense non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Dépense supprimée avec succès'
        });

    } catch (error) {
        console.error('Erreur suppression dépense:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de la dépense'
        });
    }
};