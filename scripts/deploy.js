// scripts/deploy.js - Automatisation du déploiement
const fs = require('fs').promises;
const path = require('path');
const simpleGit = require('simple-git');
const chalk = require('chalk');
const inquirer = require('inquirer');

class DeploymentManager {
    constructor() {
        this.outputDir = path.join(__dirname, '../output');
        this.git = simpleGit();
    }

    async deployToNetlify(siteDir, siteName) {
        try {
            console.log(chalk.blue(`🚀 Déploiement de ${siteName}...`));

            // 1. Initialiser Git si nécessaire
            const gitDir = path.join(siteDir, '.git');
            const hasGit = await fs.access(gitDir).then(() => true).catch(() => false);

            if (!hasGit) {
                await this.initializeGit(siteDir);
            }

            // 2. Ajouter et commit les fichiers
            const siteGit = simpleGit(siteDir);
            await siteGit.add('.');
            await siteGit.commit(`Deploy ${siteName} - ${new Date().toISOString()}`);

            // 3. Instructions pour Netlify
            console.log(chalk.green('✅ Site prêt pour Netlify!'));
            console.log(chalk.yellow('\n📋 Instructions de déploiement:'));
            console.log(`1. Créer un repository Git pour: ${siteDir}`);
            console.log(`2. Push le code vers GitHub/GitLab`);
            console.log(`3. Connecter le repository à Netlify`);
            console.log(`4. Netlify détectera automatiquement la configuration`);

            return true;

        } catch (error) {
            console.error(chalk.red(`❌ Erreur de déploiement:`), error);
            return false;
        }
    }

    async initializeGit(siteDir) {
        const siteGit = simpleGit(siteDir);
        await siteGit.init();
        
        // Créer .gitignore
        const gitignoreContent = `node_modules/
*.log
.DS_Store
.env
dist/
tmp/`;
        
        await fs.writeFile(path.join(siteDir, '.gitignore'), gitignoreContent);
        console.log(chalk.green('📝 Git initialisé'));
    }

    async deployAll() {
        const sites = await fs.readdir(this.outputDir);
        
        for (const site of sites) {
            const siteDir = path.join(this.outputDir, site);
            const stat = await fs.stat(siteDir);
            
            if (stat.isDirectory()) {
                await this.deployToNetlify(siteDir, site);
            }
        }
    }
}

// scripts/create-client.js - Générateur de configuration client
const createClientConfig = async () => {
    console.log(chalk.blue('🎨 Création d\'une nouvelle configuration client\n'));

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'clientName',
            message: 'Nom du client:',
            validate: input => input.trim() !== ''
        },
        {
            type: 'input',
            name: 'clientSlug',
            message: 'Slug (URL):',
            default: answers => answers.clientName.toLowerCase().replace(/\s+/g, '-')
        },
        {
            type: 'input',
            name: 'title',
            message: 'Titre du site:',
            default: answers => answers.clientName
        },
        {
            type: 'input',
            name: 'description',
            message: 'Description SEO:'
        },
        {
            type: 'input',
            name: 'primaryColor',
            message: 'Couleur primaire (hex):',
            default: '#3498db'
        },
        {
            type: 'input',
            name: 'secondaryColor',
            message: 'Couleur secondaire (hex):',
            default: '#2c3e50'
        },
        {
            type: 'list',
            name: 'siteType',
            message: 'Type de site:',
            choices: [
                { name: 'Restaurant', value: 'restaurant' },
                { name: 'Portfolio', value: 'portfolio' },
                { name: 'Entreprise', value: 'business' },
                { name: 'E-commerce', value: 'ecommerce' },
                { name: 'Blog', value: 'blog' }
            ]
        }
    ]);

    // Générer la configuration basée sur le type
    const config = generateConfigByType(answers);

    // Sauvegarder
    const configPath = path.join(__dirname, '../clients', `${answers.clientSlug}.json`);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    console.log(chalk.green(`✅ Configuration créée: ${configPath}`));
    return configPath;
};

function generateConfigByType(answers) {
    const baseConfig = {
        client: {
            name: answers.clientName,
            slug: answers.clientSlug,
            domain: `${answers.clientSlug}.netlify.app`
        },
        seo: {
            title: answers.title,
            description: answers.description,
            keywords: "",
            favicon: "/assets/favicon.ico"
        },
        theme: {
            primaryColor: answers.primaryColor,
            secondaryColor: answers.secondaryColor,
            accentColor: "#e74c3c",
            backgroundColor: "#ffffff",
            textColor: "#333333",
            fontFamily: "'Inter', sans-serif",
            borderRadius: "8px"
        }
    };

    // Templates spécifiques par type
    const templates = {
        restaurant: {
            header: {
                logo: "/assets/logo.png",
                navigation: [
                    {"label": "Accueil", "href": "#home"},
                    {"label": "Menu", "href": "#menu"},
                    {"label": "À propos", "href": "#about"},
                    {"label": "Contact", "href": "#contact"}
                ]
            },
            hero: {
                title: `Bienvenue chez ${answers.clientName}`,
                subtitle: "Une expérience culinaire unique",
                backgroundImage: "/assets/hero-bg.jpg",
                ctaButton: {
                    text: "Réserver une table",
                    href: "#contact",
                    style: "primary"
                }
            },
            sections: [
                {
                    id: "about",
                    type: "text-image",
                    title: "Notre Histoire",
                    content: "Découvrez notre passion pour la cuisine...",
                    image: "/assets/about.jpg",
                    layout: "image-right"
                }
            ]
        },
        business: {
            header: {
                logo: "/assets/logo.png",
                navigation: [
                    {"label": "Accueil", "href": "#home"},
                    {"label": "Services", "href": "#services"},
                    {"label": "À propos", "href": "#about"},
                    {"label": "Contact", "href": "#contact"}
                ]
            },
            hero: {
                title: answers.clientName,
                subtitle: "Votre partenaire de confiance",
                backgroundImage: "/assets/hero-bg.jpg",
                ctaButton: {
                    text: "Nos services",
                    href: "#services",
                    style: "primary"
                }
            }
        }
        // Ajouter d'autres templates...
    };

    return {
        ...baseConfig,
        ...templates[answers.siteType],
        contact: {
            title: "Nous Contacter",
            address: {
                street: "Adresse à compléter",
                city: "Ville",
                country: "France"
            },
            phone: "+33 X XX XX XX XX",
            email: `contact@${answers.clientSlug}.com`,
            socialMedia: []
        },
        footer: {
            copyright: `© 2024 ${answers.clientName}. Tous droits réservés.`,
            links: []
        }
    };
}

// scripts/dev-server.js - Serveur de développement
const express = require('express');
const chokidar = require('chokidar');
const path = require('path');
const SiteGenerator = require('./generate-site');

class DevServer {
    constructor() {
        this.app = express();
        this.port = 3000;
        this.generator = new SiteGenerator();
    }

    async start() {
        // Servir les fichiers statiques
        this.app.use(express.static(path.join(__dirname, '../output')));
        
        // API pour lister les sites
        this.app.get('/api/sites', async (req, res) => {
            try {
                const sites = await fs.readdir(path.join(__dirname, '../output'));
                res.json(sites.filter(site => site !== '.DS_Store'));
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Watcher pour regeneration automatique
        const watcher = chokidar.watch(path.join(__dirname, '../clients/*.json'));
        watcher.on('change', async (filePath) => {
            console.log(chalk.yellow(`🔄 Configuration modifiée: ${filePath}`));
            try {
                await this.generator.generateSite(filePath);
                console.log(chalk.green('✅ Site régénéré automatiquement'));
            } catch (error) {
                console.error(chalk.red('❌ Erreur de régénération:'), error);
            }
        });

        this.app.listen(this.port, () => {
            console.log(chalk.green(`🚀 Serveur de développement démarré sur http://localhost:${this.port}`));
        });
    }
}

// Export des classes
module.exports = {
    DeploymentManager,
    createClientConfig,
    DevServer
};

// CLI
async function main() {
    const args = process.argv.slice(2);
    
    if (args[0] === 'deploy') {
        const manager = new DeploymentManager();
        if (args[1]) {
            const siteDir = path.join(__dirname, '../output', args[1]);
            await manager.deployToNetlify(siteDir, args[1]);
        } else {
            await manager.deployAll();
        }
    } else if (args[0] === 'new-client') {
        const configPath = await createClientConfig();
        const generator = new SiteGenerator();
        await generator.generateSite(configPath);
    } else if (args[0] === 'dev') {
        const server = new DevServer();
        await server.start();
    }
}

if (require.main === module) {
    main().catch(console.error);
}