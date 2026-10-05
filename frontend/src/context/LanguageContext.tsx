import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    'sidebar.dashboard': 'Dashboard',
    'sidebar.my_projects': 'Mes Projets',
    'sidebar.workspaces': 'Espaces de travail',
    'sidebar.configuration': 'Configuration',
    'sidebar.config_desc': 'Gérer les clés API',
    'sidebar.pro_desc': 'Débloquer les fonctionnalités IA.',
    
    'settings.title': 'Paramètres du compte',
    'settings.subtitle': 'Gérez vos informations personnelles et la sécurité.',
    'settings.profile': 'Profil',
    'settings.security': 'Sécurité',
    'settings.appearance': 'Apparence & Langue',
    
    'settings.personal_info': 'Informations personnelles',
    'settings.firstname': 'Prénom',
    'settings.lastname': 'Nom',
    'settings.email': 'Adresse Email',
    'settings.email_desc': 'Pour modifier votre email, veuillez contacter le support.',
    'settings.role': 'Role',
    
    'settings.password_title': 'Modifier le mot de passe',
    'settings.new_password': 'Nouveau mot de passe',
    'settings.password_desc': 'Choisissez un mot de passe fort.',
    'settings.old_password': 'Ancien mot de passe',
    'settings.forgot_old_password': 'J\'ai oublié mon ancien mot de passe',
    'settings.otp_info': 'Nous allons vous envoyer un code OTP par email pour vérifier votre identité.',
    'settings.send_otp': 'Envoyer le code OTP',
    'settings.otp_code_label': 'Code OTP (reçu par email)',
    'settings.confirm_modify': 'Confirmer et modifier',
    'settings.modify_password': 'Modifier le mot de passe',
    'settings.verifying': 'Vérification...',
    'settings.password_success': 'Mot de passe modifié avec succès.',
    
    'settings.app_theme': 'Thème de l\'application',
    'settings.dark_mode': 'Mode Sombre',
    'settings.light_mode': 'Mode Clair',
    'settings.dark_mode_desc': 'Ajuste l\'apparence de TeraSprint',
    'settings.toggle_theme': 'Basculer le thème',
    
    'settings.ui_language': 'Langue de l\'interface',
    'settings.app_language': 'Langue de l\'interface',
    'settings.lang_desc': 'Langue des agents et de l\'IDE',
    'settings.language_desc': 'Langue des agents et de l\'IDE',
    'settings.french': 'Français',
    'settings.english': 'Anglais',
    'settings.active_sessions': 'Sessions Actives',
    'settings.logout_others': 'Déconnecter les autres appareils',
    'settings.no_sessions': 'Aucune session trouvée.',
    'settings.unknown_device': 'Appareil Inconnu',
    'settings.current_device': 'Appareil actuel',
    
    'common.save': 'Enregistrer',
    'common.save_changes': 'Enregistrer les modifications',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
    
    // Auth
    'auth.welcome': 'Bienvenue sur TeraSprint',
    'auth.welcome_desc': 'Connectez-vous pour accéder à votre espace de travail intelligent.',
    'auth.join': 'Rejoindre TeraSprint',
    'auth.join_desc': 'Créez votre compte pour commencer à générer des projets.',
    'auth.email': 'ADRESSE E-MAIL',
    'auth.password': 'MOT DE PASSE',
    'auth.fullname': 'NOM COMPLET',
    'auth.confirm_password': 'CONFIRMER MOT DE PASSE',
    'auth.login_btn': 'Se connecter',
    'auth.register_btn': 'Créer un compte',
    'auth.or_continue': 'Ou continuer avec',
    'auth.no_account': 'Pas encore de compte ?',
    'auth.has_account': 'Déjà un compte ?',
    'auth.forgot_password': 'Mot de passe oublié ?',
    
    'auth.forgot_password_title': 'Mot de passe oublié',
    'auth.forgot_step1': 'Entrez votre email pour recevoir un code OTP.',
    'auth.forgot_step2': 'Entrez le code à 6 chiffres reçu par email.',
    'auth.forgot_step3': 'Choisissez un nouveau mot de passe sécurisé.',
    'auth.sending': 'Envoi...',
    'auth.send_otp': 'Envoyer le code OTP',
    'auth.verify_code': 'Vérifier le code',
    'auth.modifying': 'Modification...',
    'auth.modify_password': 'Modifier le mot de passe',
    'auth.verifying': 'Vérification...',
    'auth.new_password': 'Nouveau mot de passe',
    'auth.sso_welcome': 'Bienvenue !',
    'auth.sso_setup_desc': 'Pour finaliser la création de votre compte via SSO, veuillez configurer un mot de passe. Cela vous permettra de vous connecter soit par email/mot de passe, soit par SSO.',
    'auth.configuring': 'Configuration...',
    'auth.save_password': 'Enregistrer le mot de passe',
    
    // Projects
    'projects.title': 'Mes Projets',
    'projects.desc': 'Recherchez et accédez à vos architectures de projets générées.',
    'projects.search_placeholder': 'Rechercher un projet par nom ou date...',
    'projects.new_project': 'Nouveau Projet',
    'projects.no_projects_title': 'Aucun projet trouvé',
    'projects.no_projects_desc': 'Vous n\'avez pas encore généré de projet.',
    'projects.no_search_results': 'Aucun projet ne correspond à votre recherche',
    
    // Board & Backlog
    'board.start_dev': 'DÉMARRER DEV',
    'board.files': 'FICHIERS',
    'board.report': 'RAPPORT',
    'board.todo': 'À FAIRE',
    'board.in_progress': 'EN COURS',
    'board.in_review': 'EN REVUE',
    'board.done': 'TERMINÉ',
    
    // Sprints
    'sprints.work_details': 'DÉTAILS DU TRAVAIL',
    'sprints.assignees': 'Assignés',
    'sprints.user_story': 'USER STORY',
    'sprints.members': 'Membres',
    'sprints.new_work_item': 'Nouvel Élément',
    'sprints.filters': 'Filtres :',
    // Backlog Grid
    'backlog.order': 'Ordre',
    'backlog.type': 'Type',
    'backlog.title': 'Titre',
    'backlog.state': 'Statut',
    'backlog.effort': 'Effort',
    'backlog.business_value': 'Valeur Métier',
    'backlog.assignee': 'Assigné',
    'backlog.assign_to': 'Assigner à...',
    'backlog.unassigned': 'Non assigné',
    
    // Providers
    'providers.title': 'Providers & Modèles IA',
    'providers.desc': 'Gérez vos fournisseurs d\'intelligence artificielle. Ajoutez vos clés API pour débloquer l\'accès aux modèles, puis filtrez finement les modèles que vous souhaitez utiliser dans vos espaces de travail.',
    'providers.config_title': 'Configuration des Providers (Clés API)',
    'providers.save_keys': 'Enregistrer les clés',
    'providers.saving': 'Sauvegarde...',
    'providers.models_title': 'Sélection Détaillée des Modèles',
    'providers.select_all': 'Tout sélectionner',
    'providers.deselect_all': 'Tout désélectionner',
    'providers.search': 'Rechercher par nom ou ID...',
    
    'providers.or_desc': 'Recommandé pour le code (Claude, GPT-4)',
    'providers.groq_desc': 'Génération ultra-rapide (Llama 3)',
    'providers.gemini_desc': 'Modèles natifs (Gemini 1.5 Pro)',
    'providers.configured': 'Configuré',
    'providers.fast_filter': 'Filtrage Rapide',
    'providers.free': 'Gratuits',
    'providers.premium': 'Premium',
    'providers.enable_groq': 'Activer tout Groq',
    'providers.enable_google': 'Activer tout Google',
    'providers.get_key': 'Obtenir une clé',
    
    // Generator
    'generator.hello': 'Bonjour',
    'generator.operator': 'Opérateur',
    'generator.placeholder': 'Décrivez l\'application que vous souhaitez construire...',
    'generator.last_project': 'Dernier projet généré',
    'generator.suggestion1': 'Un système ERP complet de gestion d\'entrepôt et de logistique avec suivi GPS.',
    'generator.suggestion2': 'Une plateforme SaaS de télémédecine avec consultations vidéo WebRTC.',
    'generator.disclaimer': 'L\'IA peut faire des erreurs. Vérifiez le Backlog généré dans le Kanban.',
    
    'generator.agent_thinking': 'TeraSprint réfléchit...',
    'generator.agent_error': 'Erreur de l\'Architecte',
    'generator.log_init': 'Initialisation de l\'Agent Architecte...',
    'generator.log_report': 'Génération du Rapport d\'Architecture...',
    'generator.log_tasks_us': 'Génération des tâches pour la US :',
    'generator.log_cache_us': 'Tâches récupérées du cache pour :',
    'generator.log_parallel': 'Génération parallèle des tâches...',
    'generator.log_outline': 'Génération de l\'Outline (Epics & US)...',
    'generator.api_keys': 'CLÉS API',
    
    'generator.success_title': 'J\'ai terminé la conception de votre projet',
    'generator.success_epics': 'J\'ai généré',
    'generator.success_and': 'Epics et un total de',
    'generator.success_us': 'User Stories prêtes pour l\'implémentation.',
    'generator.success_desc': 'Vous pouvez consulter l\'architecture détaillée et gérer vos tickets dans l\'espace Kanban.',
    'generator.open_kanban': 'Ouvrir l\'Espace de Travail (Kanban)',

    // IDE Workspace
    'ide.back_to_project': 'Retour au projet',
    'ide.ide_title': 'IDE',
    'ide.select_file': 'Sélectionnez un fichier pour l\'afficher',
    'ide.push_github': 'Pousser vers GitHub',
    'ide.export_zip': 'Export ZIP',
    'ide.not_connected': 'Compte non connecté',
    'ide.connect_github': 'Se connecter avec GitHub',
    'ide.new_repo_name': 'Nom du nouveau dépôt GitHub',
    'ide.private_repo_notice': 'Le dépôt sera créé en mode privé sur votre compte.',
    'ide.cancel': 'Annuler',
    'ide.create_and_push': 'Créer et Pousser',
    'ide.creating': 'Création...',
    'ide.github_desc': 'Vous devez vous connecter avec GitHub pour pouvoir créer des dépôts et pousser votre code automatiquement.',
    'ide.close': 'Fermer',
    'ide.github_repo': 'Dépôt GitHub',
    'ide.existing': 'Existant',
    'ide.new': 'Nouveau',
    'ide.select_repo': 'Sélectionner un dépôt...',
    'ide.no_repo_found': 'Aucun dépôt trouvé.',
    'ide.remote_repo': 'Dépôt distant GitHub',
    'ide.private_repo_notice2': 'Le dépôt sera créé en mode privé.',
    'ide.branch': 'Branche',
    'ide.push_success': 'Code poussé avec succès !',
    'ide.push_again': 'Pousser à nouveau',
  },
  en: {
    'sidebar.dashboard': 'Dashboard',
    'sidebar.my_projects': 'My Projects',
    'sidebar.workspaces': 'Workspaces',
    'sidebar.configuration': 'Configuration',
    'sidebar.config_desc': 'Manage API keys',
    'sidebar.pro_desc': 'Unlock AI advanced features.',
    
    'settings.title': 'Account Settings',
    'settings.subtitle': 'Manage your personal information and security.',
    'settings.profile': 'Profile',
    'settings.security': 'Security',
    'settings.appearance': 'Appearance & Language',
    
    'settings.personal_info': 'Personal Information',
    'settings.firstname': 'First Name',
    'settings.lastname': 'Last Name',
    'settings.email': 'Email Address',
    'settings.email_desc': 'To change your email, please contact support.',
    'settings.role': 'Role',
    
    'settings.password_title': 'Change Password',
    'settings.new_password': 'New Password',
    'settings.password_desc': 'Choose a strong password.',
    'settings.old_password': 'Current Password',
    'settings.forgot_old_password': 'I forgot my current password',
    'settings.otp_info': 'We will send you an OTP code by email to verify your identity.',
    'settings.send_otp': 'Send OTP Code',
    'settings.otp_code_label': 'OTP Code (received by email)',
    'settings.confirm_modify': 'Confirm and Modify',
    'settings.modify_password': 'Modify Password',
    'settings.verifying': 'Verifying...',
    'settings.password_success': 'Password changed successfully.',
    
    'settings.app_theme': 'Application Theme',
    'settings.dark_mode': 'Dark Mode',
    'settings.light_mode': 'Light Mode',
    'settings.dark_mode_desc': 'Adjust the appearance of TeraSprint',
    'settings.toggle_theme': 'Toggle theme',
    
    'settings.ui_language': 'Interface Language',
    'settings.app_language': 'Interface Language',
    'settings.lang_desc': 'Language for agents and IDE',
    'settings.language_desc': 'Language for agents and IDE',
    'settings.french': 'French',
    'settings.english': 'English',
    'settings.active_sessions': 'Active Sessions',
    'settings.logout_others': 'Logout other devices',
    'settings.no_sessions': 'No sessions found.',
    'settings.unknown_device': 'Unknown Device',
    'settings.current_device': 'Current device',
    
    'common.save': 'Save',
    'common.save_changes': 'Save changes',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    
    // Auth
    'auth.welcome': 'Welcome to TeraSprint',
    'ide.close': 'Close',
    'auth.welcome_desc': 'Log in to access your intelligent workspace.',
    'auth.join': 'Join TeraSprint',
    'auth.join_desc': 'Create your account to start generating projects.',
    'auth.email': 'EMAIL ADDRESS',
    'auth.password': 'PASSWORD',
    'auth.fullname': 'FULL NAME',
    'auth.confirm_password': 'CONFIRM PASSWORD',
    'auth.login_btn': 'Log In',
    'auth.register_btn': 'Create Account',
    'auth.or_continue': 'Or continue with',
    'auth.no_account': 'Don\'t have an account?',
    'auth.has_account': 'Already have an account?',
    'auth.forgot_password': 'Forgot password?',
    
    'auth.forgot_password_title': 'Forgot Password',
    'auth.forgot_step1': 'Enter your email to receive an OTP code.',
    'auth.forgot_step2': 'Enter the 6-digit code received by email.',
    'auth.forgot_step3': 'Choose a secure new password.',
    'auth.sending': 'Sending...',
    'auth.send_otp': 'Send OTP Code',
    'auth.verify_code': 'Verify Code',
    'auth.modifying': 'Modifying...',
    'auth.modify_password': 'Modify Password',
    'auth.verifying': 'Verifying...',
    'auth.new_password': 'New Password',
    'auth.sso_welcome': 'Welcome!',
    'auth.sso_setup_desc': 'To finalize your account creation via SSO, please configure a password. This will allow you to log in either via email/password or SSO in the future.',
    'auth.configuring': 'Configuring...',
    'auth.save_password': 'Save Password',
    
    // Projects
    'projects.title': 'My Projects',
    'projects.desc': 'Search and access your generated project architectures.',
    'projects.search_placeholder': 'Search for a project by name or date...',
    'projects.new_project': 'New Project',
    'projects.no_projects_title': 'No projects found',
    'projects.no_projects_desc': 'You haven\'t generated any projects yet.',
    'projects.no_search_results': 'No projects match your search',
    
    // Board & Backlog
    'board.start_dev': 'START DEV',
    'board.files': 'FILES',
    'board.report': 'REPORT',
    'board.todo': 'TO DO',
    'board.in_progress': 'IN PROGRESS',
    'board.in_review': 'IN REVIEW',
    'board.done': 'DONE',
    
    // Sprints
    'sprints.work_details': 'WORK DETAILS',
    'sprints.assignees': 'Assignees',
    'sprints.user_story': 'USER STORY',
    'sprints.members': 'Members',
    'sprints.new_work_item': 'New Work Item',
    'sprints.filters': 'Filters :',
    
    // Backlog Grid
    'backlog.order': 'Order',
    'backlog.type': 'Work Item Type',
    'backlog.title': 'Title',
    'backlog.state': 'State',
    'backlog.effort': 'Effort',
    'backlog.business_value': 'Business Value',
    'backlog.assignee': 'Assignee',
    'backlog.assign_to': 'Assign to...',
    'backlog.unassigned': 'Unassigned',
    
    // Providers
    'providers.title': 'AI Providers & Models',
    'providers.desc': 'Manage your AI providers. Add API keys to unlock models, then filter the models you want to use in your workspaces.',
    'providers.config_title': 'Providers Configuration (API Keys)',
    'providers.save_keys': 'Save Keys',
    'providers.saving': 'Saving...',
    'providers.models_title': 'Detailed Model Selection',
    'providers.select_all': 'Select All',
    'providers.deselect_all': 'Deselect All',
    'providers.search': 'Search by name or ID...',
    
    'providers.or_desc': 'Recommended for code (Claude, GPT-4)',
    'providers.groq_desc': 'Ultra-fast generation (Llama 3)',
    'providers.gemini_desc': 'Native models (Gemini 1.5 Pro)',
    'providers.configured': 'Configured',
    'providers.fast_filter': 'Quick Filter',
    'providers.free': 'Free',
    'providers.premium': 'Premium',
    'providers.enable_groq': 'Enable all Groq',
    'providers.enable_google': 'Enable all Google',
    'providers.get_key': 'Get API Key',
    
    // Generator
    'generator.hello': 'Hello',
    'generator.operator': 'Operator',
    'generator.placeholder': 'Describe the application you want to build...',
    'generator.last_project': 'Last generated project',
    'generator.suggestion1': 'A complete ERP system for warehouse and logistics management with GPS tracking.',
    'generator.suggestion2': 'A telemedicine SaaS platform with WebRTC video consultations.',
    'generator.disclaimer': 'AI can make mistakes. Verify the generated Backlog in the Kanban.',
    
    'generator.agent_thinking': 'TeraSprint is thinking...',
    'generator.agent_error': 'Architect Error',
    'generator.log_init': 'Initializing Architect Agent...',
    'generator.log_report': 'Generating Architecture Report...',
    'generator.log_tasks_us': 'Generating tasks for US:',
    'generator.log_cache_us': 'Tasks recovered from cache for:',
    'generator.log_parallel': 'Parallel tasks generation...',
    'generator.log_outline': 'Generating Outline (Epics & US)...',
    'generator.api_keys': 'API KEYS',
    
    'generator.success_title': 'I have finished designing your project',
    'generator.success_epics': 'I generated',
    'generator.success_and': 'Epics and a total of',
    'generator.success_us': 'User Stories ready for implementation.',
    'generator.success_desc': 'You can view the detailed architecture and manage your tickets in the Kanban workspace.',
    'generator.open_kanban': 'Open Workspace (Kanban)',

    // IDE Workspace
    'ide.back_to_project': 'Back to project',
    'ide.ide_title': 'IDE',
    'ide.select_file': 'Select a file to view',
    'ide.push_github': 'Push to GitHub',
    'ide.export_zip': 'Export ZIP',
    'ide.not_connected': 'Account not connected',
    'ide.connect_github': 'Connect with GitHub',
    'ide.new_repo_name': 'New GitHub repository name',
    'ide.private_repo_notice': 'The repository will be created as private in your account.',
    'ide.cancel': 'Cancel',
    'ide.create_and_push': 'Create and Push',
    'ide.creating': 'Creating...',
    'ide.github_desc': 'You must log in with GitHub to create repositories and automatically push your code.',
    'ide.github_repo': 'GitHub Repository',
    'ide.existing': 'Existing',
    'ide.new': 'New',
    'ide.select_repo': 'Select a repository...',
    'ide.no_repo_found': 'No repository found.',
    'ide.remote_repo': 'Remote GitHub Repository',
    'ide.private_repo_notice2': 'The repository will be created in private mode.',
    'ide.branch': 'Branch',
    'ide.push_success': 'Code pushed successfully!',
    'ide.push_again': 'Push again',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang === 'fr' || savedLang === 'en') {
      return savedLang;
    }
    return 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
