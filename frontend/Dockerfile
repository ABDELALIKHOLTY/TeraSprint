FROM node:20-alpine

WORKDIR /app

# Copier uniquement les fichiers de package en premier pour le cache Docker
COPY package*.json ./
RUN npm install

# Copier le reste du code
COPY . .

# Exposer le port par défaut de Vite
EXPOSE 5173

# Lancer Vite avec l'option --host pour qu'il écoute sur toutes les interfaces réseau du conteneur
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
