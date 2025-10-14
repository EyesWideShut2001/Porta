import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';


@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit
{
 
  private http = inject(HttpClient);
  protected  title = 'Sport App';
  protected members= signal<any>([]);

   async ngOnInit() {

    const _members = await this.getMembers();

    // this.members.set(_members);

    _members.subscribe(m => this.members.set(m));

    // this.members.set(await this.getMembers())
  }

  async getMembers()
  {
    try {
      return this.http.get('https://localhost:5001/api/members')
      
    } catch (error) {
      console.log(error)
      throw error;
    }
    
  }
  
}
