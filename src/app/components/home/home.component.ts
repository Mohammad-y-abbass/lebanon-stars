import { ChangeDetectorRef, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { ProjectComponent } from '../project/project.component';
import { Project, RepoLanguage, ShareInfo } from '../../models/project';
import { ProjectService } from '../../services/project.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, finalize, map, of } from 'rxjs';
import { GitHubReadMe, GitHubResponse } from '../../models/github';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { MarkdownModule } from 'ngx-markdown';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FilterPipe } from '../../pipes/filter.pipe';
import { RouterModule } from '@angular/router';
import { GithubService } from '../../services/github.service';
import { NgxPaginationModule } from 'ngx-pagination';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ProjectComponent, NgxPaginationModule,
    LazyLoadImageModule, CommonModule, ReactiveFormsModule,
    FilterPipe, MarkdownModule, RouterModule, LazyLoadImageModule,

  ],
  providers: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  destroyRef = inject(DestroyRef)
  languageFilesCount: number = 0

  @ViewChild("dataBlock", { static: true }) block: ElementRef;
  isLoading: boolean = true
  badges = ["badge-neutral", "badge-primary", "badge-secondary", "badge-accent", "badge-ghost"]

  projects: Project[] = []
  githubData: GitHubResponse
  readMeData: string
  searchForm: FormGroup
  searchText = ""
  defaultImage: string = "./assets/images/loader.gif"
  pageNumber: number = 1
  languageData: RepoLanguage[] = []

  constructor(private _projectService: ProjectService, private cdr: ChangeDetectorRef, private _fb: FormBuilder, private _githubService: GithubService) {
    this._projectService.getProjects().pipe(
      takeUntilDestroyed(),
      map((data: Project[]) => {
        this.projects = this.shuffleArray(data)
      }),
      catchError((_) => {
        return of([])
      })
    ).subscribe()
  }

  ngOnInit(): void {
    this.searchForm = this._fb.group({
      search: new FormControl("", [Validators.maxLength(30)])
    })

    this.searchForm.get("search").valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      debounceTime(300),
      map((val: string) => {
        this.searchText = val
      })
    ).subscribe()

  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges()
  }

  showModal(): void {
    this.block.nativeElement.classList.add('modal-open')
  }

  closeModal(): void {
    this.languageFilesCount = 0
    this.block.nativeElement.classList.remove('modal-open')
  }

  onPageChange(page: number): void {
    this.pageNumber = page
    window.scrollTo(0, 0)
  }

  getRadomBadge(): string {
    const random = Math.floor(Math.random() * this.badges.length)
    return this.badges[random]
  }

  getGithubInfo(slug: string): void {
    this._githubService.getGithubInfo(slug).pipe(
      takeUntilDestroyed(this.destroyRef),
      map((data: GitHubResponse) => {
        this.githubData = data
      }),
      catchError((_) => {
        return of([])
      }),
      finalize(() => {
        this.isLoading = false
      })
    ).subscribe()
  }

  getGithubRepoLangs(slug: string) {
    this._githubService.getGithubRepoLangs(slug).pipe(
      takeUntilDestroyed(this.destroyRef),
      map((data: any) => {
        if (data) {
          this.languageData = this.processLanguageData(data)
        }
      }),
      catchError((_) => {
        return of([])
      }),
      finalize(() => {
        this.isLoading = false
      })
    ).subscribe()
  }

  processLanguageData(data: RepoLanguage[]): RepoLanguage[] {
    let langData = Object.keys(data).map(key => ({ key, value: data[key] }));
    Object.values(langData).forEach(val => {
      this.languageFilesCount += val.value
    })
    let langDataLength = langData.length
    if (langDataLength > 4) {
      const otherValue = data.slice(-4).reduce((acc, cur) => acc + cur.value, 0);
      langData = [...data.slice(0, 4), { "key": "Others", "value": otherValue }];
    }
    return langData
  }

  createSlug(url: string): string {
    let pathname = new URL(url).pathname;
    let pathnames = []
    if (pathname) {
      pathnames = pathname.split("/")
    }

    var slug = pathnames.slice(-2)
    if (slug.length == 2) {
      return `${slug[0]}/${slug[1]}`
    }

    return ""
  }

  receiveInfo(data: ShareInfo): void {
    this.showModal()
    let slug = this.createSlug(data.url)
    this.getGithubInfo(slug)
    this.readMeData = `https://raw.githubusercontent.com/${slug}/master/README.md`
    this.getGithubRepoLangs(slug)
  }

  decodeReadMe(data: string): string {
    return atob(data)
  }

  buildStarHistory(fullName: string): string {
    return `https://api.star-history.com/svg?repos=${fullName}&type=Timeline`
  }

  removeTime(datetime: string): string {
    if (datetime == "") return ""
    const date = new Date(datetime)
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
  }

  shuffleArray(array: Project[]): Project[] {
    return array.sort(() => Math.random() - 0.5)
  }

}

