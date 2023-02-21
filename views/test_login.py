from django.shortcuts import render

def test_login(request):
    return render(request, 'balsamwebapp/test_login.html',{})