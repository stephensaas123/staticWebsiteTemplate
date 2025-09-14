// generate-site.js
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

// Helpers Handlebars pour les conditions
handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

handlebars.registerHelper('if', function(conditional, options) {
    if (conditional) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

class SiteGenerator {
    constructor() {
        this.templatesDir = path.join(__dirname, '../templates');
        this.clientsDir = path.join(__dirname, '../clients');
        this.outputDir = path.join(__dirname, '../output');
    }

    async generateSite(configPath) {
        try {
            console.log(`🚀 Génération du site pour: ${configPath}`);

            // 1. Charger la configuration client
            const config = await this.loadConfig(configPath);
            console.log(`📋 Configuration chargée pour: ${config.client.name}`);

            // 2. Créer le dossier de sortie
            const siteOutputDir = path.join(this.outputDir, config.client.slug);
            await fs.mkdir(siteOutputDir, { recursive: true });

            // 3. Générer l'HTML
            await this.generateHTML(config, siteOutputDir);

            // 4. Copier les assets CSS
            await this.copyAssets(siteOutputDir);

            // 5. Créer le dossier assets et README
            await this.setupProjectFiles(config, siteOutputDir);

            console.log(`✅ Site généré avec succès dans: ${siteOutputDir}`);
            console.log(`🌐 Prêt à déployer sur Netlify!`);

            return siteOutputDir;

        } catch (error) {
            console.error(`❌ Erreur lors de la génération:`, error);
            throw error;
        }
    }

    async loadConfig(configPath) {
        const configFile = await fs.readFile(configPath, 'utf8');
        return JSON.parse(configFile);
    }

    async generateHTML(config, outputDir) {
        // Charger le template HTML
        const templatePath = path.join(this.templatesDir, 'index.html');
        const templateContent = await fs.readFile(templatePath, 'utf8');

        // Compiler avec Handlebars
        const template = handlebars.compile(templateContent);
        const generatedHTML = template(config);

        // Sauvegarder l'HTML généré
        const htmlPath = path.join(outputDir, 'index.html');
        await fs.writeFile(htmlPath, generatedHTML);
        console.log(`📄 HTML généré: index.html`);
    }

    async copyAssets(outputDir) {
        // Copier le CSS
        const cssSource = path.join(this.templatesDir, 'styles.css');
        const cssTarget = path.join(outputDir, 'styles.css');
        await fs.copyFile(cssSource, cssTarget);
        console.log(`🎨 CSS copié: styles.css`);

        // Créer le dossier assets
        const assetsDir = path.join(outputDir, 'assets');
        await fs.mkdir(assetsDir, { recursive: true });
        console.log(`📁 Dossier assets créé`);
    }

    async setupProjectFiles(config, outputDir) {
        // Créer _redirects pour Netlify (SPA routing)
        const redirectsContent = `/*    /index.html   200`;
        await fs.writeFile(path.join(outputDir, '_redirects'), redirectsContent);

        // Créer netlify.toml pour la configuration
        const netlifyConfig = `[build]
  publish = "."
  
[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"

[[headers]]
  for = "/assets/*"
  [headers.values]
    cache-control = "public, max-age=31536000"`;

        await fs.writeFile(path.join(outputDir, 'netlify.toml'), netlifyConfig);

        // Créer README avec instructions
        const readmeContent = `# ${config.client.name}

Site web généré automatiquement.

## Déploiement Netlify

1. Connecter ce dossier à un repository Git
2. Connecter le repository à Netlify
3. Le site sera automatiquement déployé

## Assets requis

Placez les images suivantes dans le dossier \`assets/\`:

${this.generateAssetsList(config)}

## Configuration

Ce site a été généré à partir de la configuration:
- Nom: ${config.client.name}
- Slug: ${config.client.slug}
- Couleur primaire: ${config.theme.primaryColor}
- Email de contact: ${config.contact.email}

Pour modifier le site, éditez la configuration JSON et relancez la génération.
`;

        await fs.writeFile(path.join(outputDir, 'README.md'), readmeContent);
        console.log(`📝 README.md créé`);
    }

    generateAssetsList(config) {
        const assets = new Set();
        
        // Assets du header
        if (config.header.logo) assets.add(config.header.logo);
        
        // Assets du hero
        if (config.hero.backgroundImage) assets.add(config.hero.backgroundImage);
        
        // Assets des sections
        config.sections.forEach(section => {
            if (section.image) assets.add(section.image);
            if (section.items) {
                section.items.forEach(item => {
                    if (item.image) assets.add(item.image);
                });
            }
        });

        return Array.from(assets).map(asset => `- ${asset}`).join('\n');
    }

    async generateAllSites() {
        try {
            const configFiles = await fs.readdir(this.clientsDir);
            const jsonFiles = configFiles.filter(file => file.endsWith('.json'));

            console.log(`🔄 Génération de ${jsonFiles.length} sites...`);

            for (const configFile of jsonFiles) {
                const configPath = path.join(this.clientsDir, configFile);
                await this.generateSite(configPath);
            }

            console.log(`🎉 Tous les sites ont été générés avec succès!`);
            
        } catch (error) {
            console.error(`❌ Erreur lors de la génération globale:`, error);
        }
    }
}

// Script CLI
async function main() {
    const args = process.argv.slice(2);
    const generator = new SiteGenerator();

    if (args.length === 0) {
        console.log(`
🏗️  Générateur de Sites Web Statiques

Usage:
  node generate-site.js <config-file>     # Générer un site spécifique
  node generate-site.js --all             # Générer tous les sites
  node generate-site.js --help            # Afficher l'aide

Exemples:
  node generate-site.js clients/restaurant.json
  node generate-site.js --all
        `);
        return;
    }

    if (args[0] === '--all') {
        await generator.generateAllSites();
    } else if (args[0] === '--help') {
        console.log('Voir ci-dessus pour l\'usage');
    } else {
        const configPath = path.resolve(args[0]);
        await generator.generateSite(configPath);
    }
}

// Export pour utilisation en module
module.exports = SiteGenerator;

// Exécution directe
if (require.main === module) {
    main().catch(console.error);
}