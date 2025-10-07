#!/bin/bash

# Script de démarrage pour l'environnement de production Gandi

echo "🚀 Démarrage de Bitcoin Retire..."

# Vérifier si Node.js est disponible
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Afficher la version de Node.js
echo "📦 Version de Node.js: $(node --version)"

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install --production
fi

# Démarrer l'application
echo "🚀 Lancement du serveur..."
npm start