from django.shortcuts import render

def balsam_token_check(request):
    return render(request, 'balsamwebapp/balsam_token_check.html',{})