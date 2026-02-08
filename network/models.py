from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    following = models.ManyToManyField('self', symmetrical=False, related_name='followers', blank=True)


class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    liked = models.ManyToManyField(User, related_name='liked_posts', blank=True)

    def __str__(self):
        return f"On {self.timestamp} user {self.author} said: {self.content}"