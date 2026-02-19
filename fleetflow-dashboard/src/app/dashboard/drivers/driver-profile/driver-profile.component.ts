import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardDataService } from '../../../services/dashboard-data.service';

@Component({
    selector: 'app-driver-profile',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="p-6 w-full space-y-8" *ngIf="driver; else notFound">
        
        <!-- Header / Banner Section -->
        <div class="relative rounded-3xl overflow-hidden bg-white shadow-xl shadow-slate-200/50 border border-white/20">
        <!-- Decorative Banner -->
        <div class="h-48 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 relative overflow-hidden">
            <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
        </div>
        
        <div class="px-8 pb-8 flex flex-col md:flex-row items-end -mt-16 gap-6 relative z-10">
            <!-- Avatar -->
            <div class="h-32 w-32 rounded-3xl border-4 border-white bg-white shadow-lg flex items-center justify-center relative shrink-0">
                <div class="h-full w-full rounded-2xl bg-slate-100 flex items-center justify-center text-4xl font-bold text-slate-400 overflow-hidden">
                    <img *ngIf="driver.avatarUrl" [src]="driver.avatarUrl" class="h-full w-full object-cover">
                    <span *ngIf="!driver.avatarUrl">{{ driver.initials }}</span>
                </div>
                <div class="absolute bottom-2 right-2 h-5 w-5 rounded-full border-2 border-white ring-2 ring-slate-50"
                    [class.bg-emerald-500]="driver.status === 'active'"
                    [class.bg-slate-400]="driver.status !== 'active'"></div>
            </div>
            
            <!-- Info -->
            <div class="flex-1 pb-2">
                <div class="flex items-center gap-3 mb-1">
                    <h1 class="text-3xl font-bold text-slate-900 tracking-tight">{{ driver.name }}</h1>
                    <span class="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 uppercase tracking-wide">PRO DRIVER</span>
                </div>
                <p class="text-slate-500 font-medium flex items-center gap-2">
                <span class="text-slate-400">#{{ driver.id }}</span>
                <span class="h-1 w-1 rounded-full bg-slate-300"></span>
                <span>San Francisco Hub</span>
                </p>
                
                <div class="flex flex-wrap items-center gap-6 mt-4 text-sm text-slate-600">
                    <div class="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    {{ driver.contact }}
                    </div>
                    <div class="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    driver{{driver.id}}@captaincargo.com
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pb-2">
                <button (click)="goBack()" class="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition font-medium text-sm bg-white shadow-sm">Back</button>
                <button class="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition font-medium text-sm shadow-xl shadow-slate-900/20 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit Profile
                </button>
            </div>
        </div>
        </div>

        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Col: Stats & Vehicle -->
        <div class="space-y-8">
            <!-- Stats Cards -->
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div class="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 mb-3 group-hover:scale-110 transition-transform">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                    </div>
                    <div>
                    <span class="text-3xl font-bold text-slate-800 tracking-tight">4.9</span>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Rating</p>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div class="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <div>
                    <span class="text-3xl font-bold text-slate-800 tracking-tight">1.2k</span>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Trips</p>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div class="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <div>
                    <span class="text-3xl font-bold text-slate-800 tracking-tight">98%</span>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">On-Time</p>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div class="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 mb-3 group-hover:scale-110 transition-transform">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                    <div>
                    <span class="text-3xl font-bold text-slate-800 tracking-tight">3.5</span>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Years</p>
                    </div>
                </div>
            </div>

            <!-- Vehicle Card -->
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div class="flex items-center justify-between mb-5">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2">
                    <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2v0m12 0a2 2 0 012 2v0m-2-2a2 2 0 012-2v0"/></svg>
                    Assigned Vehicle
                    </h3>
                    <span class="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded ring-1 ring-emerald-100">Operational</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 transition-colors cursor-pointer">
                    <div class="h-14 w-14 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                    <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2v0m12 0a2 2 0 012 2v0m-2-2a2 2 0 012-2v0"/></svg>
                    </div>
                    <div>
                    <p class="font-bold text-slate-800 text-lg">Volvo FH16</p>
                    <p class="text-xs text-slate-500 font-medium">ABC-1234 • Heavy Truck</p>
                    </div>
                </div>
                <div class="mt-4 flex items-center gap-4 text-xs font-medium text-slate-500">
                    <div class="flex flex-col gap-1 flex-1">
                    <div class="flex justify-between"><span>Fuel</span> <span>85%</span></div>
                    <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div class="h-full w-[85%] bg-emerald-500 rounded-full"></div></div>
                    </div>
                    <div class="flex flex-col gap-1 flex-1">
                    <div class="flex justify-between"><span>Oil</span> <span>Good</span></div>
                    <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div class="h-full w-full bg-blue-500 rounded-full"></div></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Middle Col: Performance Chart & Awards -->
        <div class="lg:col-span-2 space-y-8">
            <!-- Performance Chart Mockup -->
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="flex items-center justify-between mb-8">
                    <h3 class="font-bold text-slate-800">Performance History</h3>
                    <select class="text-sm bg-slate-50 border-none rounded-lg text-slate-600 focus:ring-0 cursor-pointer py-1.5 px-3 font-medium">
                        <option>Last 6 Months</option>
                        <option>Last Year</option>
                    </select>
                </div>
                <!-- CSS Chart -->
                <div class="h-64 flex items-end justify-between gap-4 px-2 select-none">
                    <div class="w-full bg-slate-50 rounded-t-xl relative group h-[40%] hover:bg-slate-100 transition-all cursor-pointer">
                        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition shadow-xl font-bold">85</div>
                        <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 group-hover:text-slate-600">Jan</span>
                    </div>
                    <div class="w-full bg-slate-50 rounded-t-xl relative group h-[55%] hover:bg-slate-100 transition-all cursor-pointer">
                        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition shadow-xl font-bold">110</div>
                        <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 group-hover:text-slate-600">Feb</span>
                    </div>
                    <div class="w-full bg-slate-50 rounded-t-xl relative group h-[45%] hover:bg-slate-100 transition-all cursor-pointer">
                        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition shadow-xl font-bold">90</div>
                        <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 group-hover:text-slate-600">Mar</span>
                    </div>
                    <div class="w-full bg-slate-50 rounded-t-xl relative group h-[70%] hover:bg-slate-100 transition-all cursor-pointer">
                        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition shadow-xl font-bold">140</div>
                        <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 group-hover:text-slate-600">Apr</span>
                    </div>
                    <div class="w-full bg-slate-50 rounded-t-xl relative group h-[60%] hover:bg-slate-100 transition-all cursor-pointer">
                        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition shadow-xl font-bold">120</div>
                        <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 group-hover:text-slate-600">May</span>
                    </div>
                    <div class="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-xl relative group h-[85%] hover:to-indigo-300 transition-all shadow-lg shadow-indigo-200 cursor-pointer">
                        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition shadow-xl font-bold">170</div>
                        <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold text-indigo-600">Jun</span>
                    </div>
                </div>
                <div class="h-6"></div> <!-- Spacer for labels -->
            </div>

            <!-- Recent Activity Timeline -->
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 class="font-bold text-slate-800 mb-6">Recent Activity</h3>
                <div class="relative pl-6 space-y-8 border-l border-slate-200 ml-3">
                    
                    <!-- Item 1 -->
                    <div class="relative group">
                        <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-white border-2 border-emerald-500 shadow-sm group-hover:scale-125 transition-transform"></div>
                        <div class="flex items-start justify-between">
                        <div>
                            <p class="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">Completed Route #8921</p>
                            <p class="text-xs text-slate-500 mt-1">Delivered to Boston Distribution Center. Client signed.</p>
                        </div>
                        <span class="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">2h ago</span>
                        </div>
                    </div>

                    <!-- Item 2 -->
                    <div class="relative group">
                        <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-white border-2 border-blue-500 shadow-sm group-hover:scale-125 transition-transform"></div>
                        <div class="flex items-start justify-between">
                        <div>
                            <p class="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">Refueled Vehicle</p>
                            <p class="text-xs text-slate-500 mt-1">Added 200L Diesel at Shell Station - Zone 4.</p>
                        </div>
                        <span class="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">5h ago</span>
                        </div>
                    </div>

                    <!-- Item 3 -->
                    <div class="relative group">
                        <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-white border-2 border-slate-400 shadow-sm group-hover:scale-125 transition-transform"></div>
                        <div class="flex items-start justify-between">
                        <div>
                            <p class="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">Shift Started</p>
                            <p class="text-xs text-slate-500 mt-1">Logged in from Mobile App.</p>
                        </div>
                        <span class="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">07:58 AM</span>
                        </div>
                    </div>

                </div>
            </div>

        </div>
        
        </div>
    </div>

    <ng-template #notFound>
        <div class="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-center p-6">
        <div class="h-24 w-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
            <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        </div>
        <h2 class="text-2xl font-bold text-slate-800 mb-2">Driver Not Found</h2>
        <p class="text-slate-500 mb-8 max-w-md">The driver profile you are looking for does not exist or has been removed.</p>
        <button (click)="goBack()" class="px-6 py-3 bg-slate-900 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">Back to Drivers</button>
        </div>
    </ng-template>
   `
})
export class DriverProfileComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private dashboardDataService = inject(DashboardDataService);

    driver: any = null;

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.dashboardDataService.getDrivers().subscribe(drivers => {
                this.driver = drivers.find((d: any) => d.id === id);
            });
        }
    }

    goBack() { this.router.navigate(['/dashboard/drivers']); }
}
