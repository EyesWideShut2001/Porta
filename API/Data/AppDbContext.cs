using System;
using Microsoft.EntityFrameworkCore;
using API.Entities;

namespace API.Data;

public class AppDbContext (DbContextOptions options) : DbContext(options)
{
        public DbSet <AppUser> Users  { get; set;  }
        public DbSet <Member> Members { get; set; }
        public DbSet <Photo> Photos  { get; set;  }
        //public DbSet <Sport> Sports { get; set; }
    
}
