import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'home',
        loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
        title: 'Scholar AI - Home'
    },
    {
        path: 'login',
        loadComponent: () => import('./components/auth/login.component').then(m => m.LoginComponent),
        title: 'Scholar AI - Login'
    },
    {
        path: 'guide/:id',
        loadComponent: () => import('./components/guide/guide.component').then(m => m.GuideComponent),
        title: 'Scholar AI - Study Guide'
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
